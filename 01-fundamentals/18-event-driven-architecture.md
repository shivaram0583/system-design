# Topic 18: Event-Driven Architecture

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–17 (especially Message Queues)

---

## Table of Contents

- [A. Concept Explanation](#a-concept-explanation)
- [B. Interview View](#b-interview-view)
- [C. Practical Engineering View](#c-practical-engineering-view)
- [D. Example](#d-example)
- [E. HLD and LLD](#e-hld-and-lld)
- [F. Summary & Practice](#f-summary--practice)

---

## A. Concept Explanation

### What is Event-Driven Architecture (EDA)?

An architectural pattern where services communicate by producing and consuming **events** — records of something that happened — rather than making direct synchronous calls.

```
REQUEST-DRIVEN (synchronous):
  Order Service ──call──► Payment Service ──call──► Inventory Service
  Tight coupling: each service must know about the next.

EVENT-DRIVEN (asynchronous):
  Order Service ──publishes "OrderCreated"──► Event Bus
    Payment Service ←── subscribes to "OrderCreated"
    Inventory Service ←── subscribes to "OrderCreated"
    Notification Service ←── subscribes to "OrderCreated"
  
  Loose coupling: Order Service doesn't know who listens.
```

### Core Concepts

| Concept | Definition |
|---------|-----------|
| **Event** | An immutable record of something that happened (past tense) |
| **Producer** | Service that publishes events |
| **Consumer** | Service that reacts to events |
| **Event Bus/Broker** | Infrastructure that routes events (Kafka, SNS, EventBridge) |
| **Event Store** | Persistent log of all events (for replay, audit) |

### Types of Events

| Type | Purpose | Example | Payload |
|------|---------|---------|---------|
| **Domain Event** | Business fact occurred | OrderPlaced, PaymentProcessed | Full event data |
| **Integration Event** | Cross-service communication | UserCreated (for other services) | Minimal, public contract |
| **Command Event** | Request to do something | ProcessPayment, SendEmail | Action + parameters |
| **Change Data Capture** | DB row changed | users.row.updated | Old + new row values |

### Event Sourcing

Instead of storing current state, store the **sequence of events** that led to the current state.

```
TRADITIONAL (state-based):
  Account table: { id: 1, balance: 150 }
  
  Problem: Can't answer "What was the balance at 3pm yesterday?"

EVENT SOURCING:
  Event log:
    1. AccountCreated { id: 1, balance: 0 }
    2. Deposited { amount: 200 }
    3. Withdrawn { amount: 50 }
    
  Current state: replay events → 0 + 200 - 50 = 150
  State at event 2: replay first 2 → 0 + 200 = 200
  
  Pros: Full audit trail, time-travel, replay
  Cons: Complexity, eventual consistency, storage growth
```

### CQRS (Command Query Responsibility Segregation)

Often paired with Event Sourcing:

```
TRADITIONAL:
  Same model for reads and writes
  ┌───────────┐
  │ Service   │──read/write──► Database
  └───────────┘

CQRS:
  Separate models optimized for reads vs writes
  ┌───────────┐                    ┌──────────────┐
  │ Command   │──writes──────────►│ Write DB     │
  │ Service   │                    │ (normalized) │
  └───────────┘                    └──────┬───────┘
                                          │ events
  ┌───────────┐                    ┌──────┴───────┐
  │ Query     │──reads───────────►│ Read DB      │
  │ Service   │                    │(denormalized)│
  └───────────┘                    └──────────────┘
  
  Write DB: Optimized for writes (normalized, ACID)
  Read DB: Optimized for reads (denormalized, cached, materialized views)
  Sync: Events from write side update the read side (eventual consistency)
```

### Choreography vs Orchestration

| Pattern | How | Pros | Cons |
|---------|-----|------|------|
| **Choreography** | Each service reacts to events independently | Loose coupling, simple services | Hard to track flow, debugging difficult |
| **Orchestration** | Central orchestrator coordinates the flow | Clear flow, easy to monitor | Single point of failure, tighter coupling |

```
CHOREOGRAPHY (event-driven):
  OrderCreated → Payment listens → PaymentProcessed → Inventory listens → ...
  No central coordinator. Each service knows what to do.

ORCHESTRATION (command-driven):
  Orchestrator → "Process payment" → Payment → result → 
  Orchestrator → "Reserve inventory" → Inventory → result → ...
  Central coordinator manages the workflow.
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows events decouple services |
| **Mid** | Can design an event-driven order flow; knows Kafka basics |
| **Senior** | Discusses event sourcing, CQRS, choreography vs orchestration |
| **Staff+** | Event schema evolution, exactly-once semantics, event-driven migration strategy |

### Red Flags

- All microservice communication is synchronous
- Not considering event ordering or idempotency
- Using EDA where simple REST calls suffice (over-engineering)
- Not mentioning eventual consistency implications

### Common Questions

1. What is event-driven architecture?
2. When would you use EDA vs request-driven?
3. What is event sourcing? When would you use it?
4. Compare choreography vs orchestration.
5. What is CQRS and why pair it with event sourcing?
6. How do you handle event ordering?

---

## C. Practical Engineering View

### Event Schema Design

```json
{
  "event_id": "evt_abc123",
  "event_type": "order.created",
  "version": "1.2",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "order-service",
  "correlation_id": "req_xyz789",
  "data": {
    "order_id": "ord_456",
    "user_id": "usr_789",
    "items": [{"product_id": "p1", "qty": 2}],
    "total": 59.98
  },
  "metadata": {
    "trace_id": "trace_abc",
    "environment": "production"
  }
}

Schema rules:
  • event_id: Globally unique (UUID)
  • event_type: Namespaced (service.entity.action)
  • version: For schema evolution
  • correlation_id: Trace across services
  • data: Business payload
  • Past tense naming: OrderCreated not CreateOrder
```

### Schema Evolution

```
Backward compatible changes (safe):
  ✓ Add optional field
  ✓ Add new event type
  ✓ Add default value to new field

Breaking changes (dangerous):
  ✗ Remove field
  ✗ Rename field
  ✗ Change field type

Strategy:
  1. Use schema registry (Confluent, AWS Glue)
  2. Version events (v1, v2)
  3. Consumer handles multiple versions
  4. Deprecate old versions with migration period
```

### When NOT to Use EDA

```
DON'T use EDA for:
  ✗ Simple CRUD with 2-3 services (overkill)
  ✗ Operations requiring immediate consistency
  ✗ Simple request-response patterns
  ✗ When team is small and unfamiliar with distributed systems

DO use EDA for:
  ✓ Multiple services need to react to the same event
  ✓ Need audit trail / event replay
  ✓ High throughput with decoupled processing
  ✓ Complex workflows across many services
  ✓ Real-time data pipelines
```

---

## D. Example: E-Commerce Event Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Event Bus (Kafka)                       │
│                                                            │
│  ┌──────────┐  order.created                              │
│  │ Order    │──────────────────┬──────────┬──────────┐   │
│  │ Service  │                  │          │          │   │
│  └──────────┘                  ▼          ▼          ▼   │
│                           ┌────────┐ ┌────────┐ ┌──────┐ │
│                           │Payment │ │Inventory│ │Email │ │
│                           │Service │ │Service  │ │Svc   │ │
│                           └───┬────┘ └───┬────┘ └──────┘ │
│                               │          │                │
│  payment.processed ◄──────────┘          │                │
│  inventory.reserved ◄───────────────────┘                │
│                                                            │
│  All events stored in Kafka (7 days retention)            │
│  Analytics consumer replays events for reporting          │
└──────────────────────────────────────────────────────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Event-Driven Microservices

```
┌─────────────────────────────────────────────────────────┐
│  API Gateway                                              │
│      │                                                    │
│  ┌───┴─────────┐ commands (writes)                       │
│  │ Command API │───────────────────┐                     │
│  └─────────────┘                   │                     │
│                                    ▼                     │
│  ┌──────────────────────────────────────┐               │
│  │  Kafka (Event Bus)                    │               │
│  │  Topics: orders, payments, inventory  │               │
│  │  Partitions: 12 each                  │               │
│  │  Retention: 7 days                    │               │
│  └──────┬──────┬──────┬──────┬─────────┘               │
│         │      │      │      │                          │
│    ┌────┴┐ ┌──┴──┐ ┌─┴──┐ ┌┴──────┐                  │
│    │Order│ │Pay  │ │Inv │ │Notif  │  Event consumers   │
│    │Proj │ │Proc │ │Mgr │ │Worker │                    │
│    └──┬──┘ └─────┘ └────┘ └───────┘                    │
│       │                                                  │
│  ┌────┴────────┐ queries (reads)                        │
│  │  Query API  │──► Read-optimized DB (materialized)    │
│  └─────────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

### E.2 LLD — Event Bus Abstraction

```java
public class Event {
    private final String id = UUID.randomUUID().toString();
    private final String type;
    private final Map<String, Object> data;
    private final String source;
    private final String timestamp = Instant.now().toString();
    private final String version = "1.0";

    public Event(String type, Map<String, Object> data, String source) {
        this.type = type; this.data = data; this.source = source;
    }
    // getters
}

public class EventBus {
    private final KafkaProducer<String, String> producer;
    private final KafkaConsumer<String, String> consumer;
    private final Map<String, List<Consumer<Map<String, Object>>>> handlers = new HashMap<>();

    public EventBus(KafkaProducer<String, String> producer, KafkaConsumer<String, String> consumer) {
        this.producer = producer; this.consumer = consumer;
    }

    public void publish(Event event, String topic) {
        if (topic == null) topic = event.getType().split("\\.")[0];
        String key = (String) event.getData().getOrDefault("id", event.getId());
        producer.send(new ProducerRecord<>(topic, key, toJson(event)));
    }

    public void subscribe(String eventType, Consumer<Map<String, Object>> handlerFn) {
        handlers.computeIfAbsent(eventType, k -> new ArrayList<>()).add(handlerFn);
    }

    public void startConsuming(List<String> topics) {
        consumer.subscribe(topics);
        while (true) {
            for (var record : consumer.poll(Duration.ofMillis(1000))) {
                Map<String, Object> eventData = fromJson(record.value());
                String eventType = (String) eventData.get("type");
                for (var handler : handlers.getOrDefault(eventType, List.of())) {
                    try { handler.accept(eventData); }
                    catch (Exception e) { log.error("Handler failed for " + eventType + ": " + e); }
                }
            }
        }
    }
}
```

---

## F. Summary & Practice

### Key Takeaways

1. **EDA** = services communicate via events rather than direct calls
2. Events are **immutable facts** about something that happened (past tense)
3. **Event sourcing**: store events, derive state by replaying them
4. **CQRS**: separate read and write models, synced via events
5. **Choreography** = decentralized; **Orchestration** = centralized coordinator
6. Use **schema versioning** and a schema registry for event evolution
7. EDA enables **loose coupling, scalability, audit trails, and replay**
8. Trade-off: **eventual consistency** and **debugging complexity**
9. Don't over-engineer — use EDA when multiple consumers need the same events
10. Kafka is the de facto standard for event-driven architectures at scale

### Interview Questions

1. What is event-driven architecture?
2. Compare EDA with request-driven architecture.
3. What is event sourcing? Pros and cons?
4. What is CQRS and when would you use it?
5. Compare choreography vs orchestration.
6. How do you handle event schema evolution?
7. Design an event-driven order processing system.
8. How do you debug issues in an event-driven system?

### Practice Exercises

1. **Exercise 1**: Design an event-driven e-commerce system. List all events, producers, and consumers. Show the event flow for a complete order lifecycle.
2. **Exercise 2**: Implement event sourcing for a bank account. Show how to rebuild state, handle snapshots, and support time-travel queries.
3. **Exercise 3**: Your event-driven system has a bug where some orders are processed twice. Design the debugging and fix strategy.

---

> **Previous**: [17 — Message Queues](17-message-queues.md)
> **Next**: [19 — Pub-Sub](19-pub-sub.md)
