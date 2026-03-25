# Topic 10: Horizontal vs Vertical Scaling

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Beginner
> **Prerequisites**: Topics 1–5 (especially Scalability)

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

> **Note**: This topic was introduced in Topic 5 (Scalability). This file provides a focused deep dive on the comparison, decision framework, and implementation details.

### Quick Recap

**Vertical Scaling (Scale Up)** = make one machine bigger (more CPU, RAM, disk).
**Horizontal Scaling (Scale Out)** = add more machines and distribute the load.

### Detailed Comparison

| Dimension | Vertical | Horizontal |
|-----------|----------|-----------|
| **Mechanism** | Upgrade hardware | Add more nodes |
| **Complexity** | Low (no code changes) | High (distributed system) |
| **Cost curve** | Exponential | Linear |
| **Upper limit** | Hardware max (~256 cores, 24 TB RAM) | Theoretically unlimited |
| **Downtime** | Usually required (reboot) | Zero downtime (add live) |
| **Single point of failure** | Yes | No (redundancy) |
| **Data consistency** | Easy (single machine) | Hard (distributed state) |
| **Load balancing** | Not needed | Required |
| **Session management** | In-memory (simple) | External store needed |
| **Database scaling** | Works well initially | Requires sharding/replication |
| **Best for** | Databases, legacy, simple apps | Stateless services, web servers |
| **Cloud example** | t3.micro → m5.24xlarge | 3× m5.large behind ALB |

### Decision Framework

```
START HERE
  │
  ├─ Is the bottleneck CPU/RAM on a single machine?
  │   YES → Try vertical first (simpler)
  │   NO  ↓
  │
  ├─ Is the component stateless?
  │   YES → Horizontal scaling (easy win)
  │   NO  ↓
  │
  ├─ Is it a database?
  │   YES → Vertical first, then read replicas, then sharding
  │   NO  ↓
  │
  ├─ Do you need redundancy/HA?
  │   YES → Must go horizontal (can't be HA with one machine)
  │   NO  ↓
  │
  ├─ Is cost a concern at current scale?
  │   YES → Horizontal (commodity hardware is cheaper)
  │   NO  → Vertical (simpler to manage)
```

### When Vertical Scaling Wins

```
Scenarios favoring vertical:
  1. Database-heavy workloads (more RAM = bigger cache = fewer disk reads)
  2. In-memory computation (ML model serving, in-memory databases)
  3. Legacy monoliths (can't easily distribute)
  4. Small-to-medium scale (1K-10K QPS)
  5. Real-time low-latency (single-machine = no network hops)
  
Real examples:
  • Stack Overflow: 9 servers, heavily vertically scaled
  • Redis: Single-threaded, benefits from faster CPU/more RAM
  • PostgreSQL: More RAM = more data in shared_buffers = fewer disk I/Os
```

### When Horizontal Scaling Wins

```
Scenarios favoring horizontal:
  1. Stateless web/API servers (trivially parallelizable)
  2. Read-heavy workloads (add read replicas)
  3. Geographic distribution (serve from nearest region)
  4. High availability requirements (need redundancy)
  5. Unpredictable traffic (auto-scale in/out)
  6. Cost optimization at large scale (commodity hardware)
  
Real examples:
  • Netflix: 1000s of stateless microservice instances
  • Google Search: Fan out to 1000s of servers per query
  • CDN: Distribute content to 100s of edge locations
```

### Hybrid Approach (What Most Companies Do)

```
┌─────────────────────────────────────────────────────────┐
│                    HYBRID SCALING                         │
│                                                           │
│  Web/API Layer: HORIZONTAL                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ App1 │ │ App2 │ │ App3 │ │ App4 │  (scale out)       │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                           │
│  Cache Layer: HORIZONTAL                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐                          │
│  │Redis 1│ │Redis 2│ │Redis 3│  (cluster/scale out)     │
│  └───────┘ └───────┘ └───────┘                          │
│                                                           │
│  Database: VERTICAL + HORIZONTAL                         │
│  ┌───────────────┐  ┌─────────┐ ┌─────────┐            │
│  │Primary (BIG)  │  │Replica 1│ │Replica 2│            │
│  │64 cores       │  │(reads)  │ │(reads)  │            │
│  │512 GB RAM     │  └─────────┘ └─────────┘            │
│  └───────────────┘  (vertical)  (horizontal for reads)  │
└─────────────────────────────────────────────────────────┘
```

---

## B. Interview View

### What Interviewers Want

- Understand BOTH approaches and their trade-offs
- Know the default: "stateless services → horizontal, databases → vertical first"
- Mention specific numbers (AWS instance sizes, cost differences)
- Acknowledge that most systems use a hybrid approach

### Red Flags

- Saying "just scale horizontally" without considering statefulness
- Not mentioning the database scaling challenge
- Not knowing about auto-scaling
- Ignoring cost implications

### Common Questions

1. Compare horizontal vs vertical scaling.
2. When would you choose vertical over horizontal?
3. How would you scale a database?
4. Your app needs to handle 10× traffic tomorrow. What do you do?
5. What's the cost difference between scaling up vs out?

---

## C. Practical Engineering View

### AWS Instance Cost Comparison

| Strategy | Instance | vCPUs | RAM | Cost/month | Capacity |
|----------|----------|-------|-----|-----------|----------|
| Vertical small | m5.large | 2 | 8 GB | ~$70 | 1K QPS |
| Vertical big | m5.24xlarge | 96 | 384 GB | ~$3,400 | 20K QPS |
| Horizontal (5×) | 5× m5.large | 10 | 40 GB | ~$350 | 5K QPS |
| Horizontal (20×) | 20× m5.large | 40 | 160 GB | ~$1,400 | 20K QPS |

```
For 20K QPS:
  Vertical:   1× m5.24xlarge = $3,400/mo + SPOF
  Horizontal: 20× m5.large   = $1,400/mo + redundancy

  Horizontal is 59% cheaper AND more reliable.
  But requires: load balancer, stateless design, monitoring.
```

### Database Scaling Path

```
Phase 1: VERTICAL (0 → 10K QPS reads, 1K writes)
  Upgrade: db.r5.large → db.r5.4xlarge
  Cost increase: 8× but simple

Phase 2: READ REPLICAS (10K → 50K QPS reads)
  Add 3-5 read replicas
  Route reads to replicas, writes to primary
  Cost: 4-6× original but reads scale linearly

Phase 3: CACHING (reduce DB load by 90%)
  Add Redis cluster in front of DB
  Only cache misses hit DB
  Effective capacity: 10× with same DB

Phase 4: SHARDING (when writes exceed single-node capacity)
  Split data across multiple DB servers by shard key
  Each shard handles a fraction of writes
  Complexity: very high (cross-shard queries, resharding)
```

---

## D. Example: Scaling a Chat Application

```
STAGE 1 — Vertical (100 users):
  Single server: 4 CPU, 16 GB RAM
  WebSocket connections: ~100 concurrent
  SQLite database
  
STAGE 2 — Vertical Max (10K users):
  Upgraded server: 32 CPU, 128 GB RAM
  WebSocket connections: ~10K concurrent
  PostgreSQL (managed, vertically scaled)
  Hit limit: Single server WebSocket capacity

STAGE 3 — Horizontal (100K users):
  5 WebSocket servers behind LB (sticky sessions)
  Redis Pub/Sub for cross-server message delivery
  PostgreSQL primary + 2 read replicas
  
  User A on Server 1 sends message to User B on Server 3:
    Server 1 → Redis Pub/Sub → Server 3 → User B
  
STAGE 4 — Full Horizontal (1M users):
  20 WebSocket servers (auto-scaled)
  Kafka for message bus (replaces Redis Pub/Sub at scale)
  Cassandra for message storage (sharded by conversation_id)
  Redis Cluster for presence/typing indicators
```

---

## E. HLD and LLD

### E.1 HLD — Scaling Decision Engine

```
┌─────────────────────────────────────────┐
│         Scaling Decision                 │
│                                          │
│  Component: Web Servers                  │
│  Current: 3 instances (m5.large)        │
│  CPU: 75% avg                           │
│  Decision: SCALE OUT (+2 instances)     │
│                                          │
│  Component: Database                     │
│  Current: db.r5.xlarge                  │
│  CPU: 80%, RAM: 90%                     │
│  Decision: SCALE UP (db.r5.4xlarge)     │
│  Reason: Stateful, can't easily split   │
└─────────────────────────────────────────┘
```

### E.2 LLD — Scaling Strategy Selector

```python
class ScalingStrategy:
    VERTICAL = "vertical"
    HORIZONTAL = "horizontal"
    HYBRID = "hybrid"

class ScalingAdvisor:
    def recommend(self, component: dict) -> dict:
        if component["type"] == "stateless_service":
            return {
                "strategy": ScalingStrategy.HORIZONTAL,
                "reason": "Stateless; easily parallelizable",
                "action": f"Add {self._calc_instances_needed(component)} instances"
            }
        
        elif component["type"] == "database":
            if component["write_qps"] > component["max_single_node_writes"]:
                return {
                    "strategy": ScalingStrategy.HORIZONTAL,
                    "reason": "Write throughput exceeds single node",
                    "action": "Implement sharding"
                }
            elif component["ram_usage_pct"] > 85 or component["cpu_pct"] > 80:
                return {
                    "strategy": ScalingStrategy.VERTICAL,
                    "reason": "Single node resource saturation",
                    "action": f"Upgrade to {self._next_instance_size(component)}"
                }
            else:
                return {
                    "strategy": ScalingStrategy.HORIZONTAL,
                    "reason": "Read scaling needed",
                    "action": "Add read replica"
                }
        
        elif component["type"] == "cache":
            return {
                "strategy": ScalingStrategy.HORIZONTAL,
                "reason": "Distribute cache across nodes",
                "action": "Add nodes to cluster"
            }
        
        return {"strategy": ScalingStrategy.HYBRID, "reason": "Evaluate case by case"}
```

---

## F. Summary & Practice

### Key Takeaways

1. **Vertical** = bigger machine; **Horizontal** = more machines
2. Vertical is simpler but has hardware limits and is a SPOF
3. Horizontal is more complex but offers better cost, availability, and unlimited scaling
4. **Stateless services → horizontal**; **Databases → vertical first, then horizontal**
5. Most production systems use a **hybrid** approach
6. Horizontal scaling requires: load balancing, stateless design, external session store
7. Database scaling path: vertical → read replicas → caching → sharding
8. At large scale, horizontal is significantly cheaper per unit of capacity

### Interview Questions

1. Compare horizontal and vertical scaling with pros and cons.
2. When is vertical scaling the better choice?
3. How do you scale a relational database?
4. Your system needs 10× capacity by next week. Plan the scaling approach.
5. What changes are needed in your application to support horizontal scaling?

### Practice Exercises

1. **Exercise 1**: Your PostgreSQL DB handles 5K QPS on db.r5.2xlarge. You need 50K QPS. Design the scaling plan (vertical, replicas, caching, sharding). Calculate cost at each stage.

2. **Exercise 2**: Convert a stateful web app (sessions in memory) to support horizontal scaling. List every change needed.

3. **Exercise 3**: Compare the cost of serving 100K QPS using vertical (1 big machine) vs horizontal (many small machines) on AWS. Include LB costs for horizontal.

---

> **Previous**: [09 — ACID vs BASE](09-acid-vs-base.md)
> **Next**: [11 — Stateless vs Stateful](11-stateless-vs-stateful.md)
