# Comparison and Decision Making

> In system design, choosing the right tool is as important as knowing how to use it. This section provides decision frameworks for the most common choices.

## Topics

| # | Comparison | When You Face This Decision |
|---|-----------|---------------------------|
| 01 | [How to Choose a Database](01-how-to-choose-db.md) | Every system design, always |
| 02 | [How to Choose a Cache](02-how-to-choose-cache.md) | When performance matters (almost always) |
| 03 | [Kafka vs RabbitMQ](03-kafka-vs-rabbitmq.md) | When you need async messaging |
| 04 | [SQL vs NoSQL Decision](04-sql-vs-nosql-decision.md) | When choosing primary data store |
| 05 | [Monolith vs Microservices](05-monolith-vs-microservices-decision.md) | When defining system architecture |
| 06 | [Sync vs Async Communication](06-sync-vs-async.md) | When services need to talk |
| 07 | [REST vs gRPC vs GraphQL](07-rest-vs-grpc-vs-graphql.md) | When designing APIs |

## Quick Decision Cheat Sheet

### Database Selection

```mermaid
flowchart TB
    N0["Need ACID transactions + joins? -&gt; SQL (PostgreSQL, MySQL)<br/>Need flexible schema + scale? -&gt; Document DB (MongoDB)<br/>Need simple key-value at speed? -&gt; Key-Value (Redis, DynamoDB)<br/>Need analytics on huge data? -&gt; Columnar (Cassandra, ClickHouse)<br/>Need relationship traversal? -&gt; Graph DB (Neo4j)<br/>Need time-series metrics? -&gt; Time-Series (InfluxDB, TimescaleDB)"]
```

### Communication Protocol

```mermaid
flowchart TB
    N0["Public API, CRUD operations? -&gt; REST<br/>Internal service-to-service, low latency? -&gt; gRPC<br/>Mobile/frontend with flexible queries? -&gt; GraphQL<br/>Fire-and-forget, event streaming? -&gt; Kafka / Message Queue<br/>Real-time bidirectional? -&gt; WebSocket"]
```

### Architecture Style

```mermaid
flowchart TB
    N0["Small team, early stage, simple domain? -&gt; Monolith<br/>Large team, complex domain, independent scaling? -&gt; Microservices<br/>Need both? -&gt; Start monolith, extract services as needed"]
```
