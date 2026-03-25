# HLD 04: Notification System

> **Difficulty**: Medium
> **Key Concepts**: Push/pull, message queues, priority, templating, multi-channel

---

## 1. Requirements

### Functional Requirements

- Send notifications via multiple channels: push (mobile), email, SMS, in-app
- Support templates with dynamic variables
- Priority levels (critical, high, normal, low)
- User notification preferences (opt-in/out per channel)
- Notification history (read/unread status)
- Rate limiting per user (no notification spam)

### Non-Functional Requirements

- **Reliability**: No lost notifications (at-least-once delivery)
- **Scale**: 10M notifications/day, 1B/month
- **Low latency**: Critical notifications < 1s, normal < 30s
- **Extensible**: Easy to add new channels (Slack, WhatsApp)

---

## 2. Capacity Estimation

```
Notifications: 10M/day ≈ 115/sec average, 500/sec peak
  Push: 60%, Email: 25%, SMS: 10%, In-app: 100% (always)

Storage:
  10M/day × 500 bytes × 365 days = 1.8 TB/year (notification history)

Third-party API limits:
  FCM (Firebase): 500K/sec (generous)
  SES (Email): 200/sec default (request increase)
  Twilio (SMS): 100/sec (per number, use multiple)
```

---

## 3. API Design

```
POST /api/v1/notifications/send
  Request: {
    "user_ids": ["u1", "u2"],
    "template_id": "order_shipped",
    "data": {"order_id": "123", "tracking_url": "..."},
    "priority": "high",
    "channels": ["push", "email"]   // optional override
  }
  Response: { "notification_id": "n_abc", "status": "queued" }

GET /api/v1/notifications?user_id=u1&unread=true&limit=20
  Response: { "notifications": [...], "unread_count": 5, "next_cursor": "..." }

PUT /api/v1/notifications/{id}/read
  Response: 200 OK

PUT /api/v1/users/{id}/preferences
  Request: { "email": true, "push": true, "sms": false, "quiet_hours": "22:00-08:00" }
```

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────┐     ┌──────────────┐                        │
│  │  Services   │────►│ Notification │  Validates, templates, │
│  │ (Order Svc, │     │  Service     │  checks preferences    │
│  │  Auth Svc)  │     └──────┬───────┘                        │
│  └─────────────┘            │                                 │
│                        ┌────┴────┐                            │
│                        │  Kafka  │  Priority queues           │
│                        │ Topics  │  (critical, high, normal)  │
│                        └────┬────┘                            │
│                             │                                  │
│              ┌──────────────┼──────────────┐                  │
│              │              │              │                   │
│        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐           │
│        │Push Worker│ │Email Worker│ │SMS Worker │           │
│        │ (FCM/APNS)│ │ (SES)     │ │ (Twilio)  │           │
│        └───────────┘ └───────────┘ └───────────┘           │
│                                                                │
│  ┌─────────────┐     ┌──────────────┐                        │
│  │ PostgreSQL  │     │    Redis     │                        │
│  │ (history,   │     │ (unread cnt, │                        │
│  │  templates, │     │  rate limit, │                        │
│  │  prefs)     │     │  dedup)      │                        │
│  └─────────────┘     └──────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Key Design Decisions

### Priority Queues

```
Kafka topics by priority:
  notifications.critical  → 10 consumers (process immediately)
  notifications.high      → 5 consumers
  notifications.normal    → 3 consumers
  notifications.low       → 1 consumer (batch, delay OK)

Critical: password reset, 2FA, security alerts
High: order updates, payment confirmations
Normal: social notifications, recommendations
Low: weekly digests, promotional
```

### Template Engine

```
Template: "Hi {{user_name}}, your order #{{order_id}} has shipped!"
Data: {"user_name": "Alice", "order_id": "123"}
Result: "Hi Alice, your order #123 has shipped!"

Templates stored in DB, cached in Redis.
Each channel has its own template variant:
  push: short (< 100 chars)
  email: HTML with branding
  SMS: concise (< 160 chars)
  in-app: structured JSON
```

### Deduplication

```
Problem: Retry logic may send duplicate notifications.
Solution: Idempotency key per notification.

  Redis SET NX with TTL:
    key = "notif:dedup:{user_id}:{template_id}:{data_hash}"
    if SET NX succeeds → process notification
    if SET NX fails → already sent, skip

  TTL: 1 hour (prevent duplicate within 1 hour window)
```

---

## 6. Scaling & Bottlenecks

```
Bottleneck 1: Third-party API rate limits
  Solution: Worker pools with configurable concurrency
  SES: 200/sec → 5 workers × 40/sec each
  Back-pressure: if provider is slow, Kafka buffers

Bottleneck 2: Fan-out (send to 1M users)
  Solution: Batch processing
  Split 1M user list into chunks of 1000
  Each chunk is a Kafka message → workers process in parallel

Bottleneck 3: Notification history reads
  Solution: Cache unread count in Redis
  Paginate history with keyset pagination
  Archive old notifications (> 90 days) to cold storage
```

---

## 7. Trade-offs

| Decision | Trade-off |
|----------|-----------|
| At-least-once vs exactly-once | Reliability vs potential duplicates |
| Per-channel workers vs unified | Isolation vs operational complexity |
| Real-time vs batched (digest) | Timeliness vs reduced notification fatigue |
| Push vs pull for in-app | Instant updates vs simpler architecture |

---

## 8. Summary

- **Core**: Event-driven pipeline — services emit events → Kafka → channel workers → deliver
- **Priority**: Separate Kafka topics for critical/high/normal/low
- **Templates**: Pre-defined templates with dynamic variable substitution
- **Preferences**: Per-user opt-in/out per channel, quiet hours
- **Reliability**: At-least-once with idempotency/dedup in Redis
- **Scale**: Kafka for buffering, parallel workers per channel

> **Next**: [05 — Chat Application](05-chat-application.md)
