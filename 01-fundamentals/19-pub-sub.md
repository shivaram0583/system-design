# Topic 19: Pub-Sub (Publish-Subscribe)

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 17–18 (Message Queues, Event-Driven Architecture)

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

### What is Pub-Sub?

**Publish-Subscribe** is a messaging pattern where publishers send messages to a **topic** (not to specific receivers), and subscribers receive all messages from topics they subscribe to.

```
POINT-TO-POINT (Queue):
  Producer → Queue → ONE Consumer gets each message

PUB-SUB (Topic):
  Publisher → Topic → ALL Subscribers get every message

  ┌───────────┐          ┌─────────────┐
  │ Publisher  │──event──►│   Topic     │──event──► Subscriber A
  └───────────┘          │ "orders"    │──event──► Subscriber B
                         └─────────────┘──event──► Subscriber C
  
  Publisher doesn't know who subscribes.
  New subscribers can be added without changing the publisher.
```

### Pub-Sub vs Message Queue

| Aspect | Message Queue | Pub-Sub |
|--------|-------------|---------|
| **Delivery** | One consumer per message | All subscribers get every message |
| **Coupling** | Producer knows the queue | Publisher doesn't know subscribers |
| **Use case** | Task distribution, work queue | Event broadcasting, notifications |
| **Consumer scaling** | Competing consumers (load split) | Each subscriber gets full copy |
| **Message retention** | Removed after consumption | Can be retained (Kafka) |

### Fan-Out Pattern

```
A single event needs to trigger multiple independent actions:

  Order Created Event
       │
       ├──► Payment Service (charge card)
       ├──► Inventory Service (reserve stock)
       ├──► Email Service (send confirmation)
       ├──► Analytics Service (track conversion)
       └──► Fraud Service (check for fraud)

Without pub-sub: Order Service calls each one (tight coupling, slow)
With pub-sub: Order Service publishes once, 5 subscribers react independently
```

### Pub-Sub Implementations

| System | How Pub-Sub Works | Retention | Ordering |
|--------|------------------|-----------|----------|
| **Kafka** | Topics + consumer groups | Days/weeks (configurable) | Per-partition |
| **AWS SNS** | Topics + subscriptions (push) | No retention (fire-and-forget) | Best-effort |
| **AWS SNS + SQS** | SNS fans out to SQS queues | SQS retains messages | Per-queue |
| **Google Pub/Sub** | Topics + subscriptions (pull/push) | 7 days default | Per-subscription |
| **Redis Pub/Sub** | Channels (in-memory, fire-and-forget) | No retention | Per-channel |
| **RabbitMQ** | Fanout exchange → queues | Per-queue policy | Per-queue |
| **NATS** | Subjects + subscribers | Optional (JetStream) | Per-subject |

### Kafka Consumer Groups (Pub-Sub + Load Balancing)

```
Kafka combines pub-sub with competing consumers via consumer groups:

Topic: "orders" (6 partitions)

Consumer Group A (Payment):    Sees ALL messages
  Consumer A1: partitions 0,1
  Consumer A2: partitions 2,3
  Consumer A3: partitions 4,5

Consumer Group B (Email):      Sees ALL messages
  Consumer B1: partitions 0,1,2
  Consumer B2: partitions 3,4,5

Consumer Group C (Analytics):  Sees ALL messages
  Consumer C1: all 6 partitions (single consumer)

Each GROUP gets every message (pub-sub).
Within a group, messages are load-balanced (queue behavior).
```

---

## B. Interview View

### What Interviewers Expect

- Understand pub-sub vs point-to-point
- Know fan-out pattern and when to use it
- Can design notification systems using pub-sub
- Know Kafka consumer groups combine pub-sub + competing consumers

### Red Flags

- Using pub-sub when point-to-point suffices (unnecessary fan-out)
- Not considering message ordering across subscribers
- Not mentioning SNS+SQS pattern for AWS designs

### Common Questions

1. What is pub-sub? How does it differ from a message queue?
2. When would you use pub-sub?
3. How does Kafka implement pub-sub with consumer groups?
4. Design a notification system using pub-sub.
5. What is the fan-out pattern?

---

## C. Practical Engineering View

### AWS SNS + SQS Fan-Out

```
The standard AWS pattern for reliable fan-out:

  ┌──────────┐     ┌──────┐     ┌──────────┐     ┌─────────────┐
  │ Producer │────►│ SNS  │────►│ SQS (A)  │────►│ Consumer A  │
  └──────────┘     │ Topic│────►│ SQS (B)  │────►│ Consumer B  │
                   │      │────►│ SQS (C)  │────►│ Consumer C  │
                   └──────┘     └──────────┘     └─────────────┘

  SNS: Fire-and-forget pub-sub (no retention)
  SQS: Durable queue per subscriber (with DLQ, retry, visibility timeout)
  
  Why not just SNS?
    SNS is push-based. If subscriber is down, message is lost.
    SQS buffers messages. Subscriber processes at its own pace.
```

### Filtering

```
Not every subscriber needs every message:

SNS Message Filtering:
  Publisher sends: { "event": "order.created", "region": "US", "amount": 500 }
  
  Subscriber A filter: { "region": ["US"] }         → Gets this message ✓
  Subscriber B filter: { "region": ["EU"] }         → Doesn't get it ✗
  Subscriber C filter: { "amount": [{"numeric": [">=", 100]}] } → Gets it ✓

Kafka: Consumers read all messages, filter in application code
Google Pub/Sub: Supports server-side filtering
```

---

## D. Example: Real-Time Notification System

```
Events:
  user.followed, post.liked, post.commented, order.shipped

┌───────────────────────────────────────────────────────┐
│  Various Services publish events to SNS topics        │
│                                                        │
│  SNS Topic: "user-events"                             │
│      │                                                 │
│      ├──► SQS: push-notification-queue                │
│      │    → Push Notification Worker (FCM/APNS)       │
│      │                                                 │
│      ├──► SQS: email-queue                            │
│      │    → Email Worker (SES)                        │
│      │                                                 │
│      ├──► SQS: in-app-notification-queue              │
│      │    → In-App Worker (writes to notification DB) │
│      │                                                 │
│      └──► SQS: analytics-queue                        │
│           → Analytics Worker (writes to data lake)    │
│                                                        │
│  Each queue has its own DLQ and scaling policy        │
└───────────────────────────────────────────────────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Pub-Sub Event Bus

```
┌────────────────────────────────────────────────────────┐
│  Producers (any service)                                │
│  ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │Order │ │User  │ │Pay   │                           │
│  └──┬───┘ └──┬───┘ └──┬───┘                           │
│     └────────┼────────┘                                │
│              ▼                                          │
│  ┌────────────────────────────────┐                    │
│  │  Event Bus (Kafka)             │                    │
│  │  Topics: orders, users, payments│                    │
│  │  Partitions: 12 each           │                    │
│  │  Retention: 7 days             │                    │
│  └────┬──────┬──────┬──────┬─────┘                    │
│       │      │      │      │                           │
│  CG: payment CG: inv CG: notif CG: analytics         │
│  (3 inst) (3 inst) (2 inst) (1 inst)                  │
└────────────────────────────────────────────────────────┘
```

### E.2 LLD — Pub-Sub Broker

```java
public class PubSubBroker {
    private final Map<String, Map<String, Consumer<Map<String, Object>>>> topics = new HashMap<>();
    private final Map<String, Predicate<Map<String, Object>>> filters = new HashMap<>();

    public void createTopic(String topic) {
        topics.putIfAbsent(topic, new LinkedHashMap<>());
    }

    public void subscribe(String topic, String subscriberId,
                          Consumer<Map<String, Object>> callback,
                          Predicate<Map<String, Object>> filterFn) {
        createTopic(topic);
        topics.get(topic).put(subscriberId, callback);
        if (filterFn != null) filters.put(topic + ":" + subscriberId, filterFn);
    }

    public void unsubscribe(String topic, String subscriberId) {
        Map<String, Consumer<Map<String, Object>>> subs = topics.get(topic);
        if (subs != null) subs.remove(subscriberId);
        filters.remove(topic + ":" + subscriberId);
    }

    public void publish(String topic, Map<String, Object> message) {
        Map<String, Consumer<Map<String, Object>>> subscribers =
            topics.getOrDefault(topic, Map.of());
        for (var entry : subscribers.entrySet()) {
            Predicate<Map<String, Object>> filterFn =
                filters.get(topic + ":" + entry.getKey());
            if (filterFn != null && !filterFn.test(message)) continue;
            try { entry.getValue().accept(message); }
            catch (Exception e) { log.error("Subscriber " + entry.getKey() + " failed: " + e); }
        }
    }
}
```

---

## F. Summary & Practice

### Key Takeaways

1. **Pub-Sub**: publishers send to topics, all subscribers receive every message
2. **Fan-out pattern**: one event triggers multiple independent consumers
3. **Kafka consumer groups** combine pub-sub (across groups) + queue (within group)
4. **AWS SNS+SQS**: best practice for reliable fan-out in AWS
5. **Message filtering**: reduce unnecessary processing at subscriber level
6. Pub-sub enables **loose coupling** — new subscribers added without publisher changes
7. Use pub-sub for **event broadcasting**; use queues for **task distribution**

### Interview Questions

1. What is pub-sub? How does it differ from a queue?
2. What is the fan-out pattern?
3. How do Kafka consumer groups work?
4. Design a notification system using pub-sub.
5. Compare SNS, SQS, and Kafka for pub-sub.
6. When would you NOT use pub-sub?

### Practice Exercises

1. Design a pub-sub system for a social media platform (likes, comments, follows, shares).
2. Implement message filtering for a pub-sub broker that supports attribute-based filters.
3. Your fan-out system has 5 subscribers but one is consistently slow. Design the buffering and backpressure strategy.

---

> **Previous**: [18 — Event-Driven Architecture](18-event-driven-architecture.md)
> **Next**: [20 — Rate Limiting](20-rate-limiting.md)
