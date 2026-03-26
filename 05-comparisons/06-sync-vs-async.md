# Comparison 06: Sync vs Async Communication

> How services talk to each other determines system resilience and performance.

---

## 1. Decision Framework

```mermaid
flowchart TD
    A[Service Communication] --> B{Need immediate response?}
    B -->|Yes| C{Low latency critical?}
    C -->|Yes| D[gRPC sync]
    C -->|No| E[REST sync]
    B -->|No| F{Need guaranteed delivery?}
    F -->|Yes| G[Message Queue: Kafka/RabbitMQ]
    F -->|No| H{Fire-and-forget?}
    H -->|Yes| I[Async event via Kafka]
    H -->|No| J[Webhook callback]
```

---

## 2. Core Comparison

| Dimension | Synchronous | Asynchronous |
|-----------|-------------|--------------|
| **Pattern** | Request → Wait → Response | Send message → Continue working |
| **Coupling** | Tight (caller waits for callee) | Loose (decoupled via queue) |
| **Latency** | Immediate response required | Response can be delayed |
| **Failure handling** | Cascade failures (if callee is down) | Resilient (queue buffers messages) |
| **Throughput** | Limited by slowest service | High (parallel processing) |
| **Complexity** | Simple to reason about | Harder to debug, eventual consistency |
| **Examples** | REST, gRPC, GraphQL | Kafka, RabbitMQ, SQS, webhooks |

---

## 3. Synchronous Communication

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Order Service
    participant B as Payment Service
    participant D as Inventory Service

    C->>A: POST /orders
    A->>B: POST /payments (sync)
    B-->>A: 200 OK (payment confirmed)
    A->>D: POST /reserve (sync)
    D-->>A: 200 OK (reserved)
    A-->>C: 201 Created (order placed)
    Note over C,D: Total latency = sum of all calls
```

**Pros**: Simple, easy to debug, immediate feedback
**Cons**: Cascading failures, high latency (serial calls), tight coupling

---

## 4. Asynchronous Communication

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Order Service
    participant Q as Kafka
    participant B as Payment Service
    participant D as Inventory Service

    C->>A: POST /orders
    A->>Q: Publish: order.created
    A-->>C: 202 Accepted (processing)
    par Parallel consumers
        Q->>B: Consume: order.created
        B->>B: Process payment
        B->>Q: Publish: payment.completed
    and
        Q->>D: Consume: order.created
        D->>D: Reserve inventory
        D->>Q: Publish: inventory.reserved
    end
    Note over C,D: Client gets async notification later
```

**Pros**: Resilient, decoupled, parallel processing, handles spikes
**Cons**: Eventual consistency, harder to debug, no immediate response

---

## 5. Hybrid Approach (Real World)

```mermaid
graph TD
    A[Client] -->|Sync: REST| B[API Gateway]
    B -->|Sync: gRPC| C[Order Service]
    C -->|Async: Kafka| D[Payment Service]
    C -->|Async: Kafka| E[Notification Service]
    C -->|Async: Kafka| F[Analytics Service]
    C -->|Sync: gRPC| G[Inventory Service<br/>need immediate check]
```

**Rule of thumb**:
- **Sync** for reads and operations that need immediate response
- **Async** for writes, side effects, and operations that can be eventually consistent

---

## 6. When to Use Each

| Scenario | Pattern | Why |
|----------|---------|-----|
| **User login** | Sync | Need immediate auth response |
| **Place order** | Sync (accept) + Async (process) | Accept fast, process in background |
| **Send email** | Async | User doesn't wait for email delivery |
| **Check inventory** | Sync | Need real-time availability |
| **Process payment** | Async (with confirmation) | Resilient, retryable |
| **Update analytics** | Async | Fire-and-forget, eventual is fine |
| **Real-time chat** | WebSocket (async push) | Bidirectional, low latency |
| **File upload** | Sync (accept) + Async (process) | Upload fast, transcode later |

---

## 7. Failure Handling

```mermaid
flowchart TD
    subgraph Sync Failures
        A1[Service B is down] --> B1[Service A gets timeout]
        B1 --> C1[Circuit breaker opens]
        C1 --> D1[Return fallback / error to client]
    end

    subgraph Async Failures
        A2[Service B is down] --> B2[Message stays in queue]
        B2 --> C2[Service B comes back]
        C2 --> D2[Processes backlog]
        D2 --> E2[No data loss]
    end
```

---

## 8. Interview Tips

- **Default**: Use sync for queries, async for commands/events
- **Name the pattern**: "I'll use event-driven async via Kafka for order processing"
- **Acknowledge trade-offs**: "Async gives resilience but introduces eventual consistency"
- **Mention DLQ**: "Failed async messages go to a dead-letter queue for investigation"
- **Hybrid is the answer**: Most systems use both — sync for critical path, async for side effects

> **Next**: [07 — REST vs gRPC vs GraphQL](07-rest-vs-grpc-vs-graphql.md)
