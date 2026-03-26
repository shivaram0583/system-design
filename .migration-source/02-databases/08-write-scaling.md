# Topic 08: Write Scaling

> **Track**: Databases and Storage
> **Difficulty**: Advanced
> **Prerequisites**: Read Replicas, Sharding, Partitioning

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

### The Write Scaling Problem

Read replicas scale reads, but **all writes still go to a single primary**. When write throughput exceeds what one machine can handle, you need a different strategy.

```
Single primary bottleneck:
  Primary DB: max ~10K writes/s (depends on hardware, query complexity)
  
  If your app needs 50K writes/s → single primary can't handle it.
  Adding read replicas doesn't help — writes are the bottleneck.

Write scaling strategies (ordered by complexity):
  1. Vertical scaling (bigger machine) — simplest, limited ceiling
  2. Write optimization (batching, async) — low effort, moderate gain
  3. Sharding (horizontal partitioning) — splits data across DBs
  4. CQRS (separate read/write models) — architectural pattern
  5. Multi-leader replication — writes to multiple nodes
  6. Distributed databases — built-in horizontal scaling
```

### Strategy 1: Vertical Scaling

```
Scale UP: bigger CPU, more RAM, faster SSDs

  db.r6g.xlarge  → db.r6g.8xlarge
  4 vCPU, 32 GB  → 32 vCPU, 256 GB
  ~3K writes/s   → ~15K writes/s

  Pros: No application changes, simple
  Cons: Hardware ceiling, cost grows non-linearly, single point of failure
  
  Verdict: Good first step, buys time, but not a long-term solution
```

### Strategy 2: Write Optimization

```
Batch writes:
  BAD:  1000 individual INSERTs (1000 round trips)
  GOOD: 1 bulk INSERT with 1000 rows (1 round trip)
  
  INSERT INTO events (user_id, event_type, data) VALUES
    (1, 'click', '{}'), (2, 'view', '{}'), ... (1000 rows)
  
  10-50× faster than individual inserts

Async writes (write-behind):
  Application → Message Queue → Worker → Database
  
  Decouple write throughput from database throughput.
  Queue absorbs spikes; workers drain at DB's pace.

Connection pooling:
  PgBouncer: Reduce connection overhead from 1000s of app connections
  to 50 actual DB connections. Each connection costs ~10 MB RAM.

Index optimization:
  Fewer indexes = faster writes (each index updated on every INSERT)
  Remove unused indexes, use partial indexes
```

### Strategy 3: Sharding

```
Split data across multiple database instances by a shard key:

  Shard key: user_id (hash-based)
  
  user_id % 4:
    Shard 0: users 0, 4, 8, 12, ...  → DB instance A
    Shard 1: users 1, 5, 9, 13, ...  → DB instance B
    Shard 2: users 2, 6, 10, 14, ... → DB instance C
    Shard 3: users 3, 7, 11, 15, ... → DB instance D

  Write capacity: 4× single instance
  Each shard is independent (own primary + replicas)

  Challenges:
  • Cross-shard queries (JOINs across shards are expensive)
  • Cross-shard transactions (2PC or saga pattern)
  • Resharding (adding shards requires data migration)
  • Hotspots (uneven distribution)
  • Application complexity (routing logic)
```

### Strategy 4: CQRS

```
CQRS (Command Query Responsibility Segregation):
  Separate the write model from the read model.

  ┌────────────┐  Commands (writes)  ┌──────────────┐
  │ Application│─────────────────────►│ Write Store  │
  │            │                      │ (PostgreSQL) │
  │            │                      │ Normalized   │
  └─────┬──────┘                      └──────┬───────┘
        │                                     │ events
        │  Queries (reads)              ┌─────┴──────┐
        │                               │ Event Bus  │
        │                               │ (Kafka)    │
        │                               └─────┬──────┘
        │                                     │
  ┌─────┴──────────────┐              ┌──────┴───────┐
  │ Read Store         │◄─────────────│ Projector    │
  │ (Elasticsearch /   │  Materialized│ (builds read │
  │  Redis / DynamoDB) │  views       │  models)     │
  │ Denormalized       │              └──────────────┘
  └────────────────────┘

  Write store: optimized for writes (normalized, ACID)
  Read store: optimized for reads (denormalized, fast lookups)
  
  Pros: Independent scaling of reads and writes
  Cons: Eventual consistency, complexity, dual data stores
```

### Strategy 5: Multi-Leader Replication

```
Multiple nodes accept writes (contrast with single-leader):

  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Leader A │◄───►│ Leader B │◄───►│ Leader C │
  │ (US)     │     │ (EU)     │     │ (Asia)   │
  └──────────┘     └──────────┘     └──────────┘

  Each leader accepts writes for its region.
  Changes replicated asynchronously to other leaders.

  Conflict resolution (same row updated on two leaders):
  • Last-writer-wins (LWW): Latest timestamp wins (simple, data loss risk)
  • Merge: Combine changes (complex, application-specific)
  • Custom resolution: Application decides on conflict

  Used by: CockroachDB, YugabyteDB, Cassandra, DynamoDB Global Tables
```

### Strategy 6: Distributed Databases

```
Purpose-built for horizontal write scaling:

  CockroachDB / YugabyteDB / TiDB:
    SQL interface + automatic sharding + distributed transactions
    Writes spread across all nodes automatically
    No manual sharding logic needed

  Cassandra / DynamoDB:
    NoSQL, write to any node (leaderless or multi-leader)
    Tunable consistency (ONE, QUORUM, ALL)
    Designed for massive write throughput

  Trade-offs:
    Higher per-query latency (distributed consensus)
    More operational complexity
    Cost (more nodes)
    But: linear write scaling with no application sharding logic
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows sharding exists for write scaling |
| **Mid** | Can explain sharding, CQRS; knows trade-offs |
| **Senior** | Chooses appropriate strategy for given requirements; handles resharding |
| **Staff+** | Multi-leader conflict resolution, distributed DB internals, cost modeling |

### Red Flags

- Suggesting read replicas for write scaling
- Not considering the application-level complexity of sharding
- Not mentioning cross-shard query/transaction challenges

### Common Questions

1. How do you scale writes beyond a single database?
2. What is sharding? What are the challenges?
3. What is CQRS? When would you use it?
4. How do you handle cross-shard transactions?
5. Compare sharding vs distributed databases.

---

## C. Practical Engineering View

### Write Batching

```python
# BAD: Individual inserts (slow)
for event in events:
    db.execute("INSERT INTO events (data) VALUES (%s)", (event,))
    # 1000 events = 1000 round trips = ~5 seconds

# GOOD: Batch insert (fast)
values = [(e["user_id"], e["type"], e["data"]) for e in events]
db.executemany(
    "INSERT INTO events (user_id, type, data) VALUES (%s, %s, %s)",
    values
)
# 1000 events = 1 round trip = ~50ms

# BEST: COPY command (PostgreSQL, fastest bulk load)
import io
buffer = io.StringIO()
for e in events:
    buffer.write(f"{e['user_id']}\t{e['type']}\t{e['data']}\n")
buffer.seek(0)
cursor.copy_from(buffer, 'events', columns=('user_id', 'type', 'data'))
# 1000 events = ~10ms
```

### Resharding Strategy

```
Adding shards without downtime:

  Phase 1: PREPARE
    Add new shard instances (Shard 4, 5)
    Set up replication from existing shards

  Phase 2: BACKFILL
    Copy historical data to new shards based on new shard function
    hash(key) % 6 instead of hash(key) % 4

  Phase 3: DUAL WRITE
    Write to both old and new shard assignment
    Read from old shards

  Phase 4: SWITCH READS
    Start reading from new shard assignment
    Verify data consistency

  Phase 5: STOP OLD WRITES
    Only write to new shard assignment
    Clean up old data from original shards

  Tools: Vitess (MySQL), Citus (PostgreSQL), application-level
```

---

## D. Example: High-Volume Event Ingestion

```
Analytics platform: 100K events/second write throughput

  ┌────────────┐     ┌──────────────┐
  │ App/SDK    │────►│  Kafka       │  Buffer events
  │ (events)   │     │  (10 partns) │
  └────────────┘     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │  Consumers   │  Batch writes
                     │  (10 workers)│
                     └──────┬───────┘
                            │ batch INSERT (1000 rows/batch)
                     ┌──────┴───────────────────────────┐
                     │  Sharded PostgreSQL (8 shards)    │
                     │  Shard key: hash(event_id) % 8   │
                     │  Each shard: ~12.5K writes/s      │
                     │  Each shard: primary + 2 replicas │
                     └───────────────────────────────────┘

  Total write capacity: 8 × 12.5K = 100K events/s
  Kafka absorbs traffic spikes (burst to 500K/s, consumers drain at 100K/s)
  
  Read path (CQRS):
    Events → Kafka → ClickHouse (analytics queries)
    Events → Kafka → Elasticsearch (search)
    Events → Kafka → Redis (real-time counters)
```

---

## E. HLD and LLD

### E.1 HLD — Write-Scaled Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Write Path                                                │
│  Clients → API Gateway → Kafka (buffer)                   │
│                              │                             │
│                       ┌──────┴───────┐                    │
│                       │  Consumers   │                    │
│                       └──────┬───────┘                    │
│                              │ shard router               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │ Shard 0   │  │ Shard 1   │  │ Shard 2   │  ...       │
│  │ Primary   │  │ Primary   │  │ Primary   │            │
│  │ +2 Replica│  │ +2 Replica│  │ +2 Replica│            │
│  └───────────┘  └───────────┘  └───────────┘            │
│                                                            │
│  Read Path                                                │
│  Clients → API Gateway → Read Service                     │
│                              │                             │
│                     ┌────────┴─────────┐                  │
│                     │  Read Stores     │                  │
│                     │  Redis (cache)   │                  │
│                     │  ES (search)     │                  │
│                     │  ClickHouse      │                  │
│                     │  (analytics)     │                  │
│                     └──────────────────┘                  │
│                                                            │
│  Sync: Kafka CDC from shards → Read stores                │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Shard Router

```python
import hashlib

class ShardRouter:
    """Routes writes to the correct shard based on shard key"""
    
    def __init__(self, shard_connections: dict, num_shards: int):
        self.shards = shard_connections  # {0: pool, 1: pool, ...}
        self.num_shards = num_shards

    def get_shard_id(self, shard_key: str) -> int:
        hash_val = int(hashlib.md5(shard_key.encode()).hexdigest(), 16)
        return hash_val % self.num_shards

    def get_connection(self, shard_key: str, read_only: bool = False):
        shard_id = self.get_shard_id(shard_key)
        pool = self.shards[shard_id]
        if read_only:
            return pool.get_replica_connection()
        return pool.get_primary_connection()

    def execute_on_shard(self, shard_key: str, query: str, params=None):
        conn = self.get_connection(shard_key)
        result = conn.execute(query, params)
        conn.commit()
        return result

    def execute_on_all_shards(self, query: str, params=None) -> list:
        """Fan-out query to all shards (expensive, avoid if possible)"""
        results = []
        for shard_id, pool in self.shards.items():
            conn = pool.get_replica_connection()
            results.extend(conn.execute(query, params))
        return results

    def batch_insert(self, table: str, rows: list, shard_key_field: str):
        """Group rows by shard and batch insert to each"""
        shard_batches = {}
        for row in rows:
            shard_id = self.get_shard_id(str(row[shard_key_field]))
            if shard_id not in shard_batches:
                shard_batches[shard_id] = []
            shard_batches[shard_id].append(row)

        for shard_id, batch in shard_batches.items():
            conn = self.shards[shard_id].get_primary_connection()
            columns = ", ".join(batch[0].keys())
            placeholders = ", ".join(["%s"] * len(batch[0]))
            values = [tuple(row.values()) for row in batch]
            conn.executemany(
                f"INSERT INTO {table} ({columns}) VALUES ({placeholders})",
                values
            )
            conn.commit()
```

---

## F. Summary & Practice

### Key Takeaways

1. **Read replicas don't scale writes** — all writes go to one primary
2. **Vertical scaling** is the simplest first step (bigger machine)
3. **Write batching** gives 10-50× improvement with minimal code changes
4. **Async writes** via message queue decouple throughput from DB capacity
5. **Sharding** splits data across DBs — linear write scaling, but complex
6. **CQRS** separates read/write models — independent scaling of each
7. **Multi-leader** accepts writes at multiple nodes — conflict resolution required
8. **Distributed DBs** (CockroachDB, Cassandra) have built-in write scaling
9. Sharding challenges: cross-shard queries, transactions, resharding, hotspots
10. Start simple (optimize → vertical → queue → shard) not complex (don't shard on day 1)

### Interview Questions

1. How do you scale writes beyond a single database?
2. What is sharding and what are its challenges?
3. What is CQRS? When would you use it?
4. How do you handle cross-shard transactions?
5. Compare manual sharding vs distributed databases.
6. How would you handle resharding without downtime?

### Practice Exercises

1. **Exercise 1**: Design the write path for a social media platform handling 50K posts/second. Include: buffering, sharding strategy, and consistency guarantees.
2. **Exercise 2**: Your single PostgreSQL primary is at 80% write capacity. Propose a phased plan to scale writes 10×, with estimated cost and complexity for each phase.
3. **Exercise 3**: Implement a CQRS architecture for an order management system. Show the write model, event bus, read model projector, and how reads/writes are handled differently.

---

> **Previous**: [07 — Read Replicas](07-read-replicas.md)
> **Next**: [09 — Schema Design](09-schema-design.md)
