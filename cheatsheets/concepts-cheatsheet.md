# System Design Concepts Cheat Sheet

> Quick reference for all core concepts. Use this for revision before interviews.

## Scalability

| Term | Definition |
|------|-----------|
| **Horizontal Scaling** | Add more machines (scale out) |
| **Vertical Scaling** | Add more power to existing machine (scale up) |
| **Auto-scaling** | Automatically adjust capacity based on load |

## Consistency Models

| Model | Guarantee | Use Case |
|-------|----------|----------|
| **Strong Consistency** | Read always returns latest write | Banking, inventory |
| **Eventual Consistency** | Read may return stale data temporarily | Social feeds, DNS |
| **Causal Consistency** | Causally related operations seen in order | Chat messages |
| **Read-your-writes** | User always sees their own writes | User profile updates |

## CAP Theorem

```
         Consistency
            /\
           /  \
          /    \
         / CP   \
        /________\
       /\   CA   /\
      /  \      /  \
     / AP \    /    \
    /______\  /______\
 Availability    Partition
                Tolerance
```

- **CP**: Consistent + Partition-tolerant (sacrifice availability) — HBase, MongoDB
- **AP**: Available + Partition-tolerant (sacrifice consistency) — Cassandra, DynamoDB
- **CA**: Consistent + Available (no partition tolerance) — Single-node RDBMS (not distributed)
- In a distributed system, **P is mandatory** — so you choose between C and A

## ACID vs BASE

| ACID | BASE |
|------|------|
| Atomicity | Basically Available |
| Consistency | Soft state |
| Isolation | Eventually consistent |
| Durability | — |
| SQL databases | NoSQL databases |
| Strong guarantees | Flexible guarantees |

## Load Balancing Algorithms

| Algorithm | How It Works | Best For |
|-----------|-------------|----------|
| **Round Robin** | Rotate through servers sequentially | Equal-capacity servers |
| **Weighted Round Robin** | Rotate with weights per server | Mixed-capacity servers |
| **Least Connections** | Send to server with fewest active connections | Long-lived connections |
| **IP Hash** | Hash client IP to pick server | Session stickiness |
| **Random** | Pick a random server | Simple, stateless |

## Caching Strategies

| Strategy | Description | Use When |
|----------|------------|----------|
| **Cache-Aside** | App checks cache, misses go to DB | General purpose, read-heavy |
| **Read-Through** | Cache loads from DB on miss | Transparent to app |
| **Write-Through** | Write to cache AND DB simultaneously | Strong consistency needed |
| **Write-Behind** | Write to cache, async write to DB | Write-heavy, eventual consistency OK |
| **Write-Around** | Write to DB only, cache on read | Data written once, read rarely |

## Cache Eviction Policies

| Policy | Evicts | Best For |
|--------|--------|----------|
| **LRU** (Least Recently Used) | Oldest accessed item | General purpose |
| **LFU** (Least Frequently Used) | Least accessed item | Frequency matters |
| **FIFO** | First inserted item | Simple, time-based |
| **TTL** | Expired items | Time-sensitive data |

## Database Types Quick Reference

| Type | Examples | Strengths | Weaknesses |
|------|----------|----------|------------|
| **RDBMS** | PostgreSQL, MySQL | ACID, joins, mature | Scaling writes, rigid schema |
| **Document** | MongoDB, CouchDB | Flexible schema, dev speed | No joins, weaker consistency |
| **Key-Value** | Redis, DynamoDB | Fast lookups, simple | No complex queries |
| **Columnar** | Cassandra, HBase | Write throughput, wide rows | No joins, eventual consistency |
| **Graph** | Neo4j, Neptune | Relationships, traversal | Not for bulk analytics |
| **Time-Series** | InfluxDB, TimescaleDB | Append-heavy, time queries | Limited general queries |
| **Search** | Elasticsearch | Full-text search, analytics | Not primary data store |

## Message Queue Patterns

| Pattern | Description | Example |
|---------|------------|---------|
| **Point-to-Point** | One producer, one consumer | Task queue (SQS) |
| **Pub-Sub** | One producer, many consumers | Event bus (Kafka, SNS) |
| **Fan-out** | One message to all subscribers | Notifications |
| **Fan-in** | Many producers, one consumer | Log aggregation |

## API Styles

| Style | Best For | Protocol | Payload |
|-------|---------|----------|---------|
| **REST** | CRUD, public APIs | HTTP | JSON |
| **gRPC** | Internal services, low latency | HTTP/2 | Protobuf |
| **GraphQL** | Flexible frontend queries | HTTP | JSON |
| **WebSocket** | Real-time bidirectional | TCP | Any |

## Consistency Patterns

| Pattern | How It Works |
|---------|-------------|
| **2PC** (Two-Phase Commit) | Coordinator asks all nodes to prepare, then commit |
| **Saga** | Chain of local transactions with compensating actions |
| **CQRS** | Separate read and write models |
| **Event Sourcing** | Store events, derive state by replaying |

## Numbers Every Engineer Should Know

| Operation | Time |
|-----------|------|
| L1 cache reference | 0.5 ns |
| L2 cache reference | 7 ns |
| Main memory reference | 100 ns |
| SSD random read | 150 μs |
| HDD seek | 10 ms |
| Network round trip (same datacenter) | 0.5 ms |
| Network round trip (cross-continent) | 150 ms |

## Power of 2 Quick Reference

| Power | Exact | Approx |
|-------|-------|--------|
| 2^10 | 1,024 | 1 Thousand (1 KB) |
| 2^20 | 1,048,576 | 1 Million (1 MB) |
| 2^30 | 1,073,741,824 | 1 Billion (1 GB) |
| 2^40 | 1,099,511,627,776 | 1 Trillion (1 TB) |

## Common Capacity Estimates

| Metric | Typical Value |
|--------|--------------|
| QPS for a single web server | 1,000–10,000 |
| QPS for a single DB (SQL) | 1,000–5,000 |
| QPS for Redis | 100,000+ |
| Average web page size | 2–3 MB |
| Average API response | 1–10 KB |
| Seconds in a day | 86,400 (~100K) |
| Seconds in a month | ~2.5 million |
| Seconds in a year | ~30 million |
