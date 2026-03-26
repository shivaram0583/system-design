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

```
Need ACID transactions + joins? ──► SQL (PostgreSQL, MySQL)
Need flexible schema + scale? ──► Document DB (MongoDB)
Need simple key-value at speed? ──► Key-Value (Redis, DynamoDB)
Need analytics on huge data? ──► Columnar (Cassandra, ClickHouse)
Need relationship traversal? ──► Graph DB (Neo4j)
Need time-series metrics? ──► Time-Series (InfluxDB, TimescaleDB)
```

### Communication Protocol

```
Public API, CRUD operations? ──► REST
Internal service-to-service, low latency? ──► gRPC
Mobile/frontend with flexible queries? ──► GraphQL
Fire-and-forget, event streaming? ──► Kafka / Message Queue
Real-time bidirectional? ──► WebSocket
```

### Architecture Style

```
Small team, early stage, simple domain? ──► Monolith
Large team, complex domain, independent scaling? ──► Microservices
Need both? ──► Start monolith, extract services as needed
```
