# Topic 26: Sharding

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate → Advanced
> **Prerequisites**: Topics 1–25

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

### What is Sharding?

**Sharding** (horizontal partitioning) splits a large dataset across multiple database servers (shards), where each shard holds a subset of the data. It enables write scaling beyond a single machine.

```
BEFORE sharding (single DB):
  ┌────────────────────────────┐
  │  Database (1 server)       │
  │  100M users, 500 GB       │
  │  10K writes/s (maxed out) │
  └────────────────────────────┘

AFTER sharding (4 shards):
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Shard 0  │ │ Shard 1  │ │ Shard 2  │ │ Shard 3  │
  │ 25M users│ │ 25M users│ │ 25M users│ │ 25M users│
  │ 125 GB   │ │ 125 GB   │ │ 125 GB   │ │ 125 GB   │
  │ 2.5K w/s │ │ 2.5K w/s │ │ 2.5K w/s │ │ 2.5K w/s │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
  
  Total: 10K writes/s distributed across 4 servers
  Each server handles 25% of the load
```

### Sharding Strategies

#### 1. Range-Based Sharding

```
Shard by value range of the shard key:

  Shard 0: user_id 1 - 25,000,000
  Shard 1: user_id 25,000,001 - 50,000,000
  Shard 2: user_id 50,000,001 - 75,000,000
  Shard 3: user_id 75,000,001 - 100,000,000

Pros: Simple, range queries easy (find all users 1-1000)
Cons: Hotspots (new users all go to last shard), uneven distribution
Best for: Time-series data (shard by date range)
```

#### 2. Hash-Based Sharding

```
Shard = hash(shard_key) % num_shards

  hash("user_123") % 4 = 2 → Shard 2
  hash("user_456") % 4 = 0 → Shard 0
  hash("user_789") % 4 = 3 → Shard 3

Pros: Even distribution, no hotspots
Cons: Range queries impossible; resharding is painful (all data moves)
Best for: Key-value lookups, user data
```

#### 3. Consistent Hashing

```
Hash ring: nodes placed at hash positions on a circle

  ┌──── Node A ────── Node B ─────┐
  │                                │
  Node D                      Node C
  │                                │
  └────────────────────────────────┘

  hash("key1") → lands between A and B → goes to B
  hash("key2") → lands between C and D → goes to D

  Adding Node E between B and C:
    Only keys between B and E move to E
    All other keys stay → minimal data movement!

Pros: Minimal redistribution when adding/removing nodes
Cons: Can be uneven; use virtual nodes for better distribution
Best for: Distributed caches (Redis, Memcached), DynamoDB
```

#### 4. Directory-Based Sharding

```
A lookup table maps each entity to its shard:

  Lookup table:
    user_123 → Shard 2
    user_456 → Shard 0
    user_789 → Shard 1

Pros: Flexible, can move individual entities between shards
Cons: Lookup table is a SPOF and bottleneck; extra hop
Best for: Multi-tenant SaaS (each tenant on a specific shard)
```

### Comparison

| Strategy | Distribution | Range Queries | Resharding | Complexity |
|----------|-------------|--------------|-----------|-----------|
| Range | Uneven (hotspots) | Easy | Hard | Low |
| Hash | Even | Impossible | Very hard | Low |
| Consistent Hash | Even | Impossible | Minimal movement | Medium |
| Directory | Flexible | Depends | Easy (update table) | High |

### Choosing a Shard Key

```
GOOD shard keys:
  ✓ High cardinality (many unique values)
  ✓ Even distribution
  ✓ Used in most queries (avoids cross-shard queries)
  ✓ Doesn't change over time

EXAMPLES:
  E-commerce: user_id (queries are per-user)
  Chat app: conversation_id (messages queried per conversation)
  Analytics: timestamp (time-range queries)
  Multi-tenant: tenant_id (data isolation)

BAD shard keys:
  ✗ country_code (only ~200 values, uneven)
  ✗ boolean fields (only 2 values!)
  ✗ frequently changing values
```

### Cross-Shard Queries (The Hard Problem)

```
Query: "Find all orders over $100 across all users"

With shard key = user_id:
  Order data is split by user across shards.
  → Must query ALL shards → merge results → slow!

  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Shard 0  │  │ Shard 1  │  │ Shard 2  │
  │ Query... │  │ Query... │  │ Query... │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       └─────────────┼─────────────┘
                ┌────┴────┐
                │  Merge  │  ← Scatter-gather pattern
                │ Results │
                └─────────┘

Strategies:
  1. Denormalize: Store data redundantly so queries hit one shard
  2. Secondary index service: Elasticsearch for cross-shard search
  3. Materialized views: Pre-compute aggregations
  4. Avoid: Design schema so most queries use the shard key
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows sharding splits data across DBs |
| **Mid** | Knows hash vs range; can pick a shard key |
| **Senior** | Handles cross-shard queries, resharding, consistent hashing |
| **Staff+** | Multi-dimensional sharding, shard rebalancing, migration strategy |

### Red Flags

- Sharding too early (premature optimization)
- Not considering cross-shard query implications
- Choosing a poor shard key
- Not mentioning resharding challenges

### Common Questions

1. What is sharding? Why is it needed?
2. Compare hash-based vs range-based sharding.
3. How do you choose a shard key?
4. How do you handle cross-shard queries?
5. What is consistent hashing?
6. How do you add a new shard without downtime?

---

## C. Practical Engineering View

### When to Shard

```
DON'T shard until:
  1. Vertical scaling is exhausted (biggest instance type)
  2. Read replicas don't help (write bottleneck)
  3. Caching doesn't help (cache hit rate already high)
  4. You've profiled and confirmed DB is the bottleneck

Scaling path BEFORE sharding:
  1. Optimize queries + indexes
  2. Add caching (Redis)
  3. Vertical scaling (bigger DB instance)
  4. Read replicas (for read-heavy workloads)
  5. Archive old data
  6. THEN shard (last resort for writes)
```

### Resharding

```
Problem: You have 4 shards but need 8.

Hash-based: hash(key) % 4 ≠ hash(key) % 8 → most keys move!

Solutions:
  1. Consistent hashing: Add 4 virtual nodes → only ~25% of keys move
  2. Double-and-migrate: 
     New shard mapping: shard = hash(key) % 8
     Old data: migrate in background while serving reads from old shard
     Use dual-read: check new shard first, fall back to old
  3. Logical sharding: Start with 256 logical shards on 4 physical nodes
     To add nodes: move logical shards (no rehashing)

  ┌────────────────────────────────────────┐
  │  256 logical shards on 4 physical nodes │
  │                                          │
  │  Node 1: shards 0-63                   │
  │  Node 2: shards 64-127                 │
  │  Node 3: shards 128-191               │
  │  Node 4: shards 192-255               │
  │                                          │
  │  Add Node 5: move shards 192-223 → 5  │
  │  No rehashing! Just move shard files.  │
  └────────────────────────────────────────┘
```

---

## D. Example: Sharding a User Database

```
100M users, growing 10% monthly
Current: Single PostgreSQL, maxed at 10K writes/s
Need: 40K writes/s headroom

Design:
  Shard key: user_id (hash-based)
  Shards: 8 (with consistent hashing for future growth)
  
  Routing:
    shard = consistent_hash(user_id) → shard_3
    connection = shard_connections[shard_3]
    connection.execute(query)

  Schema per shard (identical):
    users (user_id, name, email, ...)
    orders (order_id, user_id, ...)
    
  Cross-shard: "Find users by email" → Elasticsearch secondary index
  Global sequences: Snowflake ID generator (no auto-increment)
```

---

## E. HLD and LLD

### E.1 HLD — Sharded Database Architecture

```
┌──────────────────────────────────────────────────┐
│  Application Layer                                │
│  ┌──────────────────────────┐                    │
│  │  Shard Router / Proxy    │                    │
│  │  (Vitess / ProxySQL)     │                    │
│  └──────┬──────┬──────┬─────┘                    │
│         │      │      │                          │
│    ┌────┴─┐ ┌──┴───┐ ┌┴─────┐ ┌──────┐         │
│    │Shard0│ │Shard1│ │Shard2│ │Shard3│         │
│    │Master│ │Master│ │Master│ │Master│         │
│    │+2 rep│ │+2 rep│ │+2 rep│ │+2 rep│         │
│    └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                  │
│  Config DB: shard mapping (which key → which shard) │
│  Elasticsearch: cross-shard search index         │
└──────────────────────────────────────────────────┘
```

### E.2 LLD — Shard Router

```python
import hashlib

class ShardRouter:
    def __init__(self, shard_connections: dict, num_virtual_nodes=150):
        self.connections = shard_connections  # {shard_id: db_connection}
        self.ring = {}  # hash_value -> shard_id
        self._build_ring(num_virtual_nodes)

    def _build_ring(self, num_virtual_nodes):
        for shard_id in self.connections:
            for i in range(num_virtual_nodes):
                key = f"{shard_id}:vn{i}"
                hash_val = self._hash(key)
                self.ring[hash_val] = shard_id
        self.sorted_keys = sorted(self.ring.keys())

    def get_shard(self, shard_key: str) -> str:
        """Get the shard ID for a given shard key using consistent hashing"""
        hash_val = self._hash(str(shard_key))
        for ring_key in self.sorted_keys:
            if hash_val <= ring_key:
                return self.ring[ring_key]
        return self.ring[self.sorted_keys[0]]  # Wrap around

    def get_connection(self, shard_key: str):
        shard_id = self.get_shard(shard_key)
        return self.connections[shard_id]

    def execute(self, shard_key: str, query: str, params=None):
        conn = self.get_connection(shard_key)
        return conn.execute(query, params)

    def scatter_gather(self, query: str, params=None):
        """Execute query on ALL shards and merge results"""
        results = []
        for shard_id, conn in self.connections.items():
            results.extend(conn.execute(query, params))
        return results

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
```

---

## F. Summary & Practice

### Key Takeaways

1. **Sharding** splits data across multiple DB servers for write scaling
2. **Hash-based**: even distribution but no range queries; **Range-based**: supports ranges but hotspot risk
3. **Consistent hashing** minimizes data movement when adding/removing shards
4. Choose shard key carefully: high cardinality, even distribution, used in most queries
5. **Cross-shard queries** are expensive — design schema to avoid them
6. Shard as a **last resort** after optimizing, caching, scaling vertically, and read replicas
7. Use **logical sharding** (many logical shards on few physical nodes) for easier resharding
8. Tools: Vitess (MySQL), Citus (PostgreSQL), native (MongoDB, Cassandra)

### Interview Questions

1. What is sharding? When do you need it?
2. Compare hash-based vs range-based sharding.
3. How do you choose a shard key?
4. What is consistent hashing? Why use it?
5. How do you handle cross-shard queries?
6. How do you add a new shard without downtime?
7. What are the alternatives before sharding?

### Practice Exercises

1. **Exercise 1**: Design the sharding strategy for a social media platform (users, posts, comments, likes). Choose shard keys and handle cross-shard queries.
2. **Exercise 2**: Implement consistent hashing with virtual nodes. Demonstrate that adding a node only moves ~1/N of keys.
3. **Exercise 3**: You have 4 shards and one is a hotspot (3× more traffic). Diagnose and fix.

---

> **Previous**: [25 — Distributed Locks](25-distributed-locks.md)
> **Next**: [27 — Replication](27-replication.md)
