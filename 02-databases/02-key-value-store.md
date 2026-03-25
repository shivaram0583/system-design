# Topic 02: Key-Value Store

> **Track**: Databases and Storage
> **Difficulty**: Intermediate
> **Prerequisites**: SQL vs NoSQL, Caching, Sharding

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

### What is a Key-Value Store?

A **key-value store** is the simplest NoSQL database model. Every piece of data is stored as a **key** (unique identifier) and a **value** (the data itself — a string, JSON, binary blob, etc.). Think of it as a giant hash map / dictionary.

```
  Key                     Value
  ─────────────────────   ─────────────────────────────
  "user:123"              {"name":"Alice","email":"a@b.com"}
  "session:abc"           {"user_id":123,"expires":1705363200}
  "cart:456"              {"items":[{"sku":"A1","qty":2}]}
  "rate_limit:10.0.0.1"  {"count":42,"window_start":1705359600}

  Operations:
    GET  "user:123"         → returns the value
    SET  "user:123" value   → stores/overwrites
    DEL  "user:123"         → removes
    TTL  "session:abc" 3600 → auto-expire in 1 hour

  No schema, no joins, no complex queries.
  Just GET and SET by key — blazing fast.
```

### Why Key-Value Stores?

```
Speed:
  In-memory stores (Redis): GET/SET in ~0.1ms (sub-millisecond)
  On-disk stores (RocksDB): GET/SET in ~1ms
  SQL query: 5-50ms (parse, plan, execute, join)

Simplicity:
  No schema migrations, no complex query planning
  Perfect when you know your key at query time

Scalability:
  Easy to shard: hash(key) → partition
  Linear horizontal scaling
  Redis Cluster: 100+ nodes, millions of ops/sec
```

### Key-Value Store Landscape

| Store | Storage | Persistence | Clustering | Best For |
|-------|---------|-------------|-----------|----------|
| **Redis** | In-memory | Optional (RDB/AOF) | Redis Cluster | Caching, sessions, real-time |
| **Memcached** | In-memory | None | Client-side sharding | Simple caching |
| **DynamoDB** | Disk (SSD) | Durable | Managed, auto-scaled | Serverless, web apps |
| **etcd** | Disk | Raft consensus | Built-in (Raft) | Config, service discovery |
| **RocksDB** | Disk (LSM) | Durable | Embedded (no cluster) | Embedded KV engine |
| **Riak KV** | Disk | Durable | Masterless | High availability |

### Data Modeling Patterns

```
KEY DESIGN is critical (it's your only "query"):

  Pattern 1: ENTITY KEYS
    "user:{user_id}"              → user profile
    "order:{order_id}"            → order data

  Pattern 2: COMPOSITE KEYS
    "user:123:orders"             → list of user's order IDs
    "chat:456:messages:latest"    → latest messages in a chat

  Pattern 3: TTL KEYS (auto-expire)
    "session:{session_id}"   TTL=3600     → session data (1 hour)
    "otp:{phone}"            TTL=300      → one-time password (5 min)
    "rate:{ip}:{minute}"     TTL=60       → rate limit counter

  Pattern 4: SORTED/SCORED (Redis sorted sets)
    ZADD "leaderboard" 1500 "player_A"
    ZADD "leaderboard" 2300 "player_B"
    ZREVRANGE "leaderboard" 0 9          → top 10 players

  Anti-pattern: Scanning all keys (no secondary indexes!)
    Never: KEYS "user:*" in production (blocks server)
```

### Redis Data Structures

```
Redis is more than just GET/SET. It has rich data structures:

  STRING:  SET key "value"              → simple key-value
  LIST:    LPUSH key "item"             → queue, recent items
  SET:     SADD key "member"            → unique collections, tags
  HASH:    HSET key field value         → object with fields
  SORTED SET: ZADD key score member     → leaderboards, rankings
  STREAM:  XADD key * field value       → event log, message queue
  BITMAP:  SETBIT key offset 1          → boolean flags, daily active users
  HYPERLOGLOG: PFADD key element        → cardinality estimation

  Example — User session as HASH:
    HSET "session:abc" "user_id" "123" "role" "admin" "login_at" "2024-01-15"
    HGET "session:abc" "user_id"   → "123"
    HGETALL "session:abc"          → all fields
    EXPIRE "session:abc" 3600      → auto-expire in 1 hour
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows Redis is fast, used for caching |
| **Mid** | Redis data structures, TTL, key design patterns |
| **Senior** | Redis Cluster, persistence modes, DynamoDB partition keys, hot keys |
| **Staff+** | Consistent hashing, Redis vs DynamoDB trade-offs, capacity planning |

### Red Flags

- Using Redis as the primary database without persistence strategy
- Not considering memory limits for in-memory stores
- Scanning all keys instead of proper key design
- Not handling cache misses or eviction

### Common Questions

1. What is a key-value store? When would you use one?
2. Compare Redis and DynamoDB.
3. How does Redis persistence work (RDB vs AOF)?
4. How would you design the key schema for [use case]?
5. How does Redis Cluster handle sharding?

---

## C. Practical Engineering View

### Redis Persistence

```
RDB (Snapshot):
  Periodically save full dataset to disk (e.g., every 5 min)
  save 300 10  → snapshot if 10+ keys changed in 300 seconds
  Pros: Compact file, fast restart
  Cons: Can lose up to 5 min of data on crash

AOF (Append-Only File):
  Log every write operation to disk
  appendfsync always   → fsync every write (safest, slowest)
  appendfsync everysec → fsync every second (good balance)
  appendfsync no       → OS decides (fastest, least safe)
  Pros: Minimal data loss (1 second max)
  Cons: Larger file, slower restarts

Hybrid (recommended):
  Enable both RDB + AOF
  RDB for fast backup/restore
  AOF for minimal data loss
  Redis 7+: AOF rewrite uses RDB format internally
```

### Redis Cluster

```
  Client ──hash(key)──► Slot 0-5460   → Node A (master) + replica
                        Slot 5461-10922 → Node B (master) + replica
                        Slot 10923-16383 → Node C (master) + replica

  16384 hash slots distributed across master nodes.
  Each key maps to a slot: CRC16(key) % 16384
  
  Automatic failover: if master dies → replica promoted
  Resharding: move slots between nodes for rebalancing

  Limitation: Multi-key operations must be on same slot
  Solution: Hash tags — {user:123}:cart and {user:123}:session → same slot
```

### DynamoDB Key Design

```
DynamoDB uses:
  Partition Key (PK): Determines which partition stores the item
  Sort Key (SK): Optional, enables range queries within a partition

  Table: UserOrders
  ┌─────────────────┬──────────────────┬────────┬────────┐
  │ PK (user_id)    │ SK (order_id)    │ total  │ status │
  ├─────────────────┼──────────────────┼────────┼────────┤
  │ user_123        │ order_2024_001   │ 99.99  │ paid   │
  │ user_123        │ order_2024_002   │ 49.50  │ pending│
  │ user_456        │ order_2024_003   │ 75.00  │ paid   │
  └─────────────────┴──────────────────┴────────┴────────┘

  Query by user: PK = "user_123" → all orders for user 123
  Query specific: PK = "user_123" AND SK = "order_2024_001"
  Range query: PK = "user_123" AND SK BETWEEN "order_2024" AND "order_2025"

  Hot partition problem:
    One user with 10M orders → one partition gets all traffic
    Solution: Add random suffix to PK for write-heavy keys
```

---

## D. Example: Session Store with Redis

```
  ┌────────┐  Login   ┌──────────┐  Store session  ┌─────────┐
  │ Client │────────►│ Auth Svc │────────────────►│  Redis  │
  │        │         │          │                  │ Cluster │
  │        │◄────────│          │◄────────────────│         │
  │        │ Cookie  │          │  session_id      │  TTL:   │
  └────────┘         └──────────┘                  │  30 min │
                                                    └─────────┘
  Login:
    1. Verify credentials
    2. session_id = uuid4()
    3. HSET "session:{session_id}" "user_id" "123" "role" "admin"
    4. EXPIRE "session:{session_id}" 1800  (30 min)
    5. Set-Cookie: session_id=...; HttpOnly; Secure

  Each request:
    1. Read session_id from cookie
    2. HGETALL "session:{session_id}"
    3. If exists → authenticated; EXPIRE to refresh TTL
    4. If not → 401 Unauthorized

  Logout:
    DEL "session:{session_id}"

  Scaling: Redis Cluster with 3 masters + 3 replicas
  Capacity: 1M concurrent sessions × 1 KB = 1 GB RAM
```

---

## E. HLD and LLD

### E.1 HLD — Distributed Key-Value Store

```
┌──────────────────────────────────────────────────────────┐
│  Clients                                                   │
│      │                                                     │
│  ┌───┴───────────┐                                        │
│  │  Application  │                                        │
│  │  (Redis SDK)  │                                        │
│  └───┬───────────┘                                        │
│      │ hash(key) → slot → node                            │
│      │                                                     │
│  ┌───┴──────────────────────────────────────────────┐    │
│  │  Redis Cluster (6 nodes)                          │    │
│  │                                                    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │    │
│  │  │Master A │  │Master B │  │Master C │          │    │
│  │  │Slots    │  │Slots    │  │Slots    │          │    │
│  │  │0-5460   │  │5461-    │  │10923-   │          │    │
│  │  │         │  │10922    │  │16383    │          │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘          │    │
│  │       │            │            │                │    │
│  │  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐          │    │
│  │  │Replica A│  │Replica B│  │Replica C│          │    │
│  │  └─────────┘  └─────────┘  └─────────┘          │    │
│  └───────────────────────────────────────────────────┘    │
│                                                            │
│  Persistence: AOF (everysec) + RDB snapshots (hourly)     │
│  Monitoring: Redis Exporter → Prometheus → Grafana        │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Key-Value Client Wrapper

```python
import redis
import json
import time

class KeyValueStore:
    """Application-level wrapper around Redis with serialization and patterns"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def get(self, key: str) -> dict | None:
        raw = self.redis.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    def set(self, key: str, value: dict, ttl_seconds: int = None):
        serialized = json.dumps(value)
        if ttl_seconds:
            self.redis.setex(key, ttl_seconds, serialized)
        else:
            self.redis.set(key, serialized)

    def delete(self, key: str):
        self.redis.delete(key)

    # --- Session Pattern ---
    def create_session(self, session_id: str, user_data: dict,
                      ttl: int = 1800) -> str:
        key = f"session:{session_id}"
        self.redis.hset(key, mapping=user_data)
        self.redis.expire(key, ttl)
        return session_id

    def get_session(self, session_id: str) -> dict | None:
        key = f"session:{session_id}"
        data = self.redis.hgetall(key)
        if not data:
            return None
        self.redis.expire(key, 1800)  # Refresh TTL on access
        return {k.decode(): v.decode() for k, v in data.items()}

    # --- Rate Limiting Pattern ---
    def check_rate_limit(self, identifier: str, max_requests: int,
                        window_seconds: int = 60) -> bool:
        key = f"rate:{identifier}:{int(time.time()) // window_seconds}"
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        results = pipe.execute()
        current_count = results[0]
        return current_count <= max_requests

    # --- Leaderboard Pattern ---
    def update_score(self, leaderboard: str, member: str, score: float):
        self.redis.zadd(leaderboard, {member: score})

    def get_top(self, leaderboard: str, count: int = 10) -> list:
        results = self.redis.zrevrange(leaderboard, 0, count - 1, withscores=True)
        return [{"member": m.decode(), "score": s} for m, s in results]

    def get_rank(self, leaderboard: str, member: str) -> int | None:
        rank = self.redis.zrevrank(leaderboard, member)
        return rank + 1 if rank is not None else None
```

---

## F. Summary & Practice

### Key Takeaways

1. **Key-value stores** = hash map at scale; GET/SET by key, sub-millisecond
2. **Redis**: in-memory, rich data structures, persistence optional (RDB/AOF)
3. **DynamoDB**: managed, disk-based, partition key + sort key, serverless
4. **Key design** is critical — it's your only query mechanism
5. **TTL** for auto-expiry (sessions, OTPs, rate limits, cache)
6. **Redis Cluster**: 16384 hash slots across masters + replicas
7. **Hash tags** `{user:123}:*` keep related keys on same slot
8. Common patterns: caching, sessions, rate limiting, leaderboards, pub/sub
9. **Never** scan all keys in production (`KEYS *` blocks the server)
10. In-memory = fast but limited by RAM; plan capacity carefully

### Interview Questions

1. What is a key-value store? When would you use one?
2. Compare Redis and DynamoDB.
3. How does Redis persistence work?
4. How does Redis Cluster distribute data?
5. Design a rate limiter using Redis.
6. How would you handle hot keys?
7. What Redis data structures would you use for a leaderboard?

### Practice Exercises

1. **Exercise 1**: Design the key schema for a URL shortener using Redis. Handle: short URL → long URL mapping, click counters, TTL for temporary links.
2. **Exercise 2**: Your Redis instance is at 90% memory. Diagnose and propose 5 strategies to reduce memory usage without losing critical data.
3. **Exercise 3**: Design a distributed session store that handles 5M concurrent sessions across 3 data centers. Address: replication, failover, and consistency.

---

> **Previous**: [01 — SQL vs NoSQL](01-sql-vs-nosql.md)
> **Next**: [03 — Document DB](03-document-db.md)
