# Fundamentals of System Design

> This section covers the foundational building blocks that every system design discussion rests upon. Master these before moving to HLD/LLD problems.

## Topics

| # | Topic | Key Question It Answers |
|---|-------|------------------------|
| 01 | [What is System Design](01-what-is-system-design.md) | What are we actually designing and why? |
| 02 | [Client-Server Architecture](02-client-server-architecture.md) | How do computers talk to each other? |
| 03 | [Monolith vs Microservices](03-monolith-vs-microservices.md) | One big app or many small ones? |
| 04 | [Latency vs Throughput](04-latency-vs-throughput.md) | Speed of one request vs total capacity? |
| 05 | [Scalability](05-scalability.md) | How do we handle more users? |
| 06 | [Availability & Reliability](06-availability-reliability.md) | How do we stay up and correct? |
| 07 | [Consistency](07-consistency.md) | When does everyone see the same data? |
| 08 | [CAP Theorem](08-cap-theorem.md) | What trade-offs are forced upon us? |
| 09 | [ACID vs BASE](09-acid-vs-base.md) | Strong guarantees vs flexibility? |
| 10 | [Horizontal vs Vertical Scaling](10-horizontal-vs-vertical-scaling.md) | Bigger machine or more machines? |
| 11 | [Stateless vs Stateful](11-stateless-vs-stateful.md) | Where does session data live? |
| 12 | [Load Balancing](12-load-balancing.md) | How is traffic distributed? |
| 13 | [Reverse Proxy](13-reverse-proxy.md) | What sits between client and server? |
| 14 | [API Gateway](14-api-gateway.md) | Single entry point for microservices? |
| 15 | [CDN](15-cdn.md) | How to serve content fast globally? |
| 16 | [Caching](16-caching.md) | How to avoid doing the same work twice? |
| 17 | [Message Queues](17-message-queues.md) | How to decouple and buffer work? |
| 18 | [Event-Driven Architecture](18-event-driven-architecture.md) | React to events instead of polling? |
| 19 | [Pub-Sub](19-pub-sub.md) | One-to-many message delivery? |
| 20 | [Rate Limiting](20-rate-limiting.md) | How to protect services from abuse? |
| 21 | [Idempotency](21-idempotency.md) | Safe to retry without side effects? |
| 22 | [Circuit Breaker](22-circuit-breaker.md) | How to fail fast and recover? |
| 23 | [Retry, Timeout, Backoff](23-retry-timeout-backoff.md) | How to handle transient failures? |
| 24 | [Service Discovery](24-service-discovery.md) | How do services find each other? |
| 25 | [Distributed Locks](25-distributed-locks.md) | How to coordinate across machines? |
| 26 | [Sharding](26-sharding.md) | How to split data across machines? |
| 27 | [Replication](27-replication.md) | How to copy data for safety and speed? |
| 28 | [Partitioning](28-partitioning.md) | How to divide data logically? |
| 29 | [Leader-Follower](29-leader-follower.md) | Who is the source of truth? |
| 30 | [Consensus Basics](30-consensus-basics.md) | How do distributed nodes agree? |
| 31 | [Data Indexing](31-data-indexing.md) | How to find data fast? |
| 32 | [Full-Text Search](32-full-text-search.md) | How to search within content? |
| 33 | [Blob/Object Storage](33-blob-object-storage.md) | Where to store files and media? |
| 34 | [Stream Processing](34-stream-processing.md) | How to process data in real-time? |
| 35 | [Batch Processing](35-batch-processing.md) | How to process data in bulk? |
| 36 | [Observability](36-observability.md) | How to know what's happening inside? |
| 37 | [Logging, Metrics, Tracing](37-logging-metrics-tracing.md) | The three pillars of observability? |
| 38 | [Security Basics](38-security-basics.md) | How to protect the system? |
| 39 | [Authentication](39-authentication.md) | Who are you? |
| 40 | [Authorization](40-authorization.md) | What are you allowed to do? |
| 41 | [OAuth, JWT, Sessions](41-oauth-jwt-sessions.md) | How to implement auth? |
| 42 | [Encryption](42-encryption.md) | How to protect data? |

## How to Study This Section

1. Read each topic in order — they build on each other
2. After every 5 topics, pause and review
3. Try explaining each concept to someone (or yourself) without notes
4. Use the interview questions at the end of each topic for self-testing
