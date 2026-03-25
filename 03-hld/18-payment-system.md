# HLD 18: Payment System

> **Difficulty**: Hard
> **Key Concepts**: Idempotency, reconciliation, PCI compliance, state machine

---

## 1. Requirements

### Functional Requirements

- Process payments (credit card, debit, wallet, bank transfer)
- Refunds (full and partial)
- Payment status tracking
- Multi-currency support
- Recurring payments / subscriptions
- Seller payouts (marketplace)
- Transaction history and receipts

### Non-Functional Requirements

- **Reliability**: No double charges, no lost payments
- **Consistency**: Exactly-once payment processing
- **Security**: PCI-DSS compliance, encryption at rest and in transit
- **Scale**: 10M transactions/day
- **Latency**: Payment processing < 5s end-to-end
- **Auditability**: Full audit trail for every transaction

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌────────┐         ┌────────────────┐                       │
│  │ Client │────────►│  API Gateway   │                       │
│  └────────┘         └───────┬────────┘                       │
│                              │                                │
│              ┌───────────────┼───────────────────┐           │
│              │               │                    │           │
│       ┌──────┴──────┐ ┌─────┴──────┐ ┌──────────┴───┐     │
│       │Payment Svc  │ │Ledger Svc  │ │Payout Svc    │     │
│       │(orchestrator│ │(double-entry│ │(seller       │     │
│       │ state mach.)│ │ accounting)│ │ disbursement)│     │
│       └──────┬──────┘ └────────────┘ └──────────────┘     │
│              │                                               │
│       ┌──────┴──────┐                                       │
│       │PSP Adapter  │  (Payment Service Provider)           │
│       │• Stripe     │                                       │
│       │• PayPal     │                                       │
│       │• Adyen      │                                       │
│       └─────────────┘                                       │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │PostgreSQL  │  │ Kafka       │  │ Redis        │        │
│  │(txns,      │  │ (events,    │  │ (idempotency │        │
│  │ ledger)    │  │  async)     │  │  keys)       │        │
│  └────────────┘  └─────────────┘  └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Key Design Decisions

### Payment State Machine

```
CREATED → PROCESSING → SUCCEEDED → SETTLED
    │         │                        │
    └→ FAILED │                   REFUND_REQUESTED → REFUNDED
              └→ FAILED                    │
                                      REFUND_FAILED

Each transition:
  1. Validate transition is allowed
  2. Update DB in transaction (optimistic locking)
  3. Call PSP if needed (Stripe charge, refund)
  4. Emit event to Kafka (payment.succeeded, payment.failed)
  5. Never delete records — append-only for audit trail
```

### Idempotency (No Double Charges)

```
Problem: Network timeout → client retries → charged twice?

Solution: Idempotency key per payment request.

  POST /api/v1/payments
  Headers: Idempotency-Key: order_123_payment_1

  Server flow:
    1. Check Redis: GET idempotency:{key}
    2. If exists → return cached response (already processed)
    3. If not → process payment
    4. Store result: SET idempotency:{key} {response} EX 86400
    5. Return response

  Redis TTL: 24 hours (covers retry window)
  DB: Also store idempotency_key on payment record (unique constraint)
  
  Even if client sends same request 10 times → charged exactly once
```

### Double-Entry Ledger

```
Every money movement recorded as two entries (debit + credit):

  Payment $100 from buyer to seller:
    Debit:  buyer_account   -$100
    Credit: platform_escrow +$100

  Platform takes 10% fee, pays seller:
    Debit:  platform_escrow -$100
    Credit: platform_revenue +$10
    Credit: seller_account   +$90

  Invariant: Sum of all debits = Sum of all credits (always balanced)

  ledger_entries:
    id | account_id | type   | amount | currency | payment_id | created_at
    1  | buyer_123  | DEBIT  | -100   | USD      | pay_abc    | ...
    2  | escrow     | CREDIT | +100   | USD      | pay_abc    | ...
    3  | escrow     | DEBIT  | -100   | USD      | pay_abc    | ...
    4  | platform   | CREDIT | +10    | USD      | pay_abc    | ...
    5  | seller_456 | CREDIT | +90    | USD      | pay_abc    | ...

  Balance check: SELECT SUM(amount) FROM ledger_entries → must equal 0
```

### Reconciliation

```
Daily reconciliation: Compare our records with PSP records.

  1. Fetch settlement report from Stripe/PayPal (what they processed)
  2. Compare with our ledger (what we recorded)
  3. Flag discrepancies:
     - Payment in our DB but not in PSP → investigate (did PSP lose it?)
     - Payment in PSP but not in our DB → investigate (did we miss a webhook?)
     - Amount mismatch → investigate (currency conversion issue?)

  Automated: Run daily at 3 AM, alert on discrepancies > $0.01
  Manual review: Finance team resolves flagged items
  
  This catches: Bugs, race conditions, PSP errors, fraud
```

---

## 4. Scaling & Bottlenecks

```
Payment processing:
  10M txns/day ≈ 115/sec → single PostgreSQL handles this
  Peak (Black Friday): 10× → 1150/sec → still manageable with connection pooling

PSP rate limits:
  Stripe: 100 req/sec per account (request increase for higher)
  Multiple PSP accounts or PSP-level sharding for higher throughput

Ledger:
  Append-only, grows fast → partition by month
  Archive old partitions to cold storage

Idempotency cache:
  Redis: 10M keys × 1 KB = 10 GB (24h TTL, auto-expires)

Event processing:
  Kafka: Payment events for downstream (notifications, analytics, reconciliation)
  At-least-once delivery → consumers must be idempotent
```

---

## 5. Trade-offs

| Decision | Trade-off |
|----------|-----------|
| Single PSP vs multi-PSP | Simplicity vs resilience + better rates |
| Sync vs async payment | Instant feedback vs higher reliability |
| Idempotency TTL (24h) | Memory vs retry window coverage |
| Ledger in same DB vs separate | Consistency vs scaling independently |

---

## 6. Summary

- **Core**: Payment state machine + idempotency + double-entry ledger
- **Idempotency**: Redis + DB unique constraint prevents double charges
- **Ledger**: Every money movement = debit + credit (always balanced)
- **Reconciliation**: Daily comparison with PSP to catch discrepancies
- **Security**: PCI-DSS, tokenized card data (never store raw card numbers)
- **PSP**: Abstract via adapter pattern (Stripe, PayPal, Adyen interchangeable)

> **Next**: [19 — Inventory Management](19-inventory-management.md)
