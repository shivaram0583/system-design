# HLD 22: Distributed Cache

> **Difficulty**: Medium
> **Key Concepts**: Consistent hashing, eviction policies, replication, cache patterns

---

## 1. Requirements

### Functional Requirements

- GET/SET/DELETE key-value pairs with optional TTL
- Support various data types (strings, hashes, lists, sets)
- Cache invalidation (manual + TTL-based)
- Cluster mode (horizontal scaling across nodes)
- Replication for high availability
- Monitoring (hit rate, memory usage, latency)

### Non-Functional Requirements

- **Latency**: < 1ms for GET/SET (in-memory)
- **Throughput**: 1M+ ops/sec per node
- **Availability**: 99.99% (cache miss = DB hit, but slow)
- **Scale**: Petabytes of cached data across cluster
- **Consistency**: Eventual consistency across replicas

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌────────────┐         ┌────────────────┐                   │
│  │ App Server │────────►│  Cache Client  │                   │
│  │            │         │  (smart routing)│                  │
│  └────────────┘         └───────┬────────┘                   │
│                                  │ hash(key) → node          │
│                                  │                            │
│       ┌──────────────────────────┼──────────────────┐       │
│       │                          │                   │       │
│  ┌────┴──────┐  ┌───────────────┴──┐  ┌────────────┴──┐   │
│  │ Node A    │  │ Node B           │  │ Node C        │   │
│  │ Keys: 0-X │  │ Keys: X-Y        │  │ Keys: Y-Z     │   │
│  │ ┌───────┐ │  │ ┌───────┐        │  │ ┌───────┐     │   │
│  │ │Replica│ │  │ │Replica│        │  │ │Replica│     │   │
│  │ └───────┘ │  │ └───────┘        │  │ └───────┘     │   │
│  └───────────┘  └──────────────────┘  └───────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Cluster Manager (gossip protocol, failover)      │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Key Design Decisions

### Consistent Hashing

```
Problem: Simple hash (key % N) breaks when adding/removing nodes.
  hash("user:123") % 3 = node 1
  Add 4th node: hash("user:123") % 4 = node 3 → DIFFERENT node!
  All keys rehash → massive cache miss storm.

Consistent hashing:
  Place nodes on a hash ring (0 to 2^32).
  For each key: hash(key) → walk clockwise → first node = owner.

  Ring: 0 ──── Node A (pos 100) ──── Node B (pos 200) ──── Node C (pos 300) ──── 0
  
  hash("user:123") = 150 → walks clockwise → Node B
  hash("user:456") = 250 → walks clockwise → Node C

  Add Node D at position 250:
    Only keys between 200-250 move from C to D.
    Other keys stay on their current node.
    Only ~1/N keys rehash (not all keys).

  Virtual nodes: Each physical node has 100-200 virtual positions.
    Ensures even distribution of keys.
    Node A: positions [10, 45, 120, 189, ...]
```

### Eviction Policies

```
When memory is full, which keys to evict?

  LRU (Least Recently Used):
    Evict key that hasn't been accessed the longest.
    Implementation: Doubly linked list + hash map.
    Redis uses approximated LRU (sample 5 random keys, evict oldest).

  LFU (Least Frequently Used):
    Evict key with lowest access count.
    Better for skewed access patterns (some keys always hot).

  TTL-based:
    Keys with TTL expire automatically.
    Volatile-LRU: Only evict keys with TTL set.

  Redis eviction policies:
    noeviction:      Return error when memory full
    allkeys-lru:     Evict any key using LRU
    volatile-lru:    Evict only TTL keys using LRU
    allkeys-lfu:     Evict any key using LFU
    allkeys-random:  Evict random keys

  Recommendation:
    allkeys-lru for general caching
    volatile-ttl for mixed (some keys permanent, some TTL)
```

### Cache Patterns

```
CACHE-ASIDE (most common):
  Read: App checks cache → miss → read DB → write to cache → return
  Write: App writes DB → invalidate cache
  Pro: Simple, app controls caching logic
  Con: First request always misses (cold start)

READ-THROUGH:
  Read: App reads cache → miss → cache reads DB → cache stores → return
  Cache is responsible for loading from DB.
  Pro: App logic simpler
  Con: Cache needs DB access configuration

WRITE-THROUGH:
  Write: App writes cache → cache writes DB synchronously
  Pro: Cache always consistent with DB
  Con: Higher write latency (two writes per operation)

WRITE-BEHIND (WRITE-BACK):
  Write: App writes cache → cache writes DB asynchronously (batched)
  Pro: Fast writes, batching reduces DB load
  Con: Data loss risk if cache crashes before DB write

REFRESH-AHEAD:
  Cache proactively refreshes keys before TTL expires.
  Pro: No cache misses for popular keys
  Con: Wasted refreshes if key isn't accessed again
```

---

## 4. Replication & Failover

```
Each primary node has 1-2 replicas:

  Primary (Node A) → Replica A1, Replica A2
  Writes go to primary → async replicated to replicas
  Reads can go to replicas (read scaling)

Failover:
  If primary dies → cluster manager promotes a replica to primary
  Redis Sentinel or Redis Cluster handles this automatically
  Downtime: 1-5 seconds during failover

Split-brain:
  Network partition → two primaries think they're the leader
  Redis: Uses WAIT command for synchronous replication when needed
  Mitigation: Require majority of nodes to agree on leader
```

---

## 5. Scaling & Bottlenecks

```
Horizontal scaling:
  Add new node → consistent hashing moves ~1/N keys
  Redis Cluster: Up to 1000 nodes, automatic sharding

Hot key problem:
  One key gets 100K reads/sec (celebrity profile, viral post)
  Solution: Read from replicas (spread load)
  Solution: Client-side caching (local cache with invalidation)
  Solution: Key replication across multiple shards

Thundering herd (cache stampede):
  Popular key expires → 1000 requests hit DB simultaneously
  Solution: Mutex lock — first request locks, rebuilds cache, others wait
  Solution: Stale-while-revalidate — serve stale, refresh async
  Solution: Jittered TTL — add random offset to TTL (prevent simultaneous expiry)
```

---

## 6. Trade-offs

| Decision | Trade-off |
|----------|-----------|
| LRU vs LFU eviction | Recency vs frequency optimization |
| Cache-aside vs write-through | Flexibility vs consistency |
| Async vs sync replication | Performance vs data safety |
| Large cluster vs fewer big nodes | Fault isolation vs operational cost |

---

## 7. Summary

- **Partitioning**: Consistent hashing with virtual nodes for even distribution
- **Eviction**: LRU (default), LFU for skewed workloads, TTL for time-based
- **Patterns**: Cache-aside (most common), write-through for consistency
- **Replication**: Primary + replicas, async, auto-failover
- **Hot keys**: Replica reads, client-side cache, key replication
- **Stampede**: Mutex lock, stale-while-revalidate, jittered TTL

> **Next**: [23 — Distributed Job Scheduler](23-distributed-job-scheduler.md)
