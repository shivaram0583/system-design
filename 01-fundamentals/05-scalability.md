# Topic 5: Scalability

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Beginner → Intermediate
> **Prerequisites**: Topic 1–4 (System Design basics, Client-Server, Monolith vs Microservices, Latency vs Throughput)

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

### What is Scalability?

**Scalability** is the ability of a system to handle **increased load** without degrading performance, by adding resources proportionally.

A system is scalable if it can grow to meet demand — more users, more data, more traffic — while maintaining acceptable latency, throughput, and reliability.

```
Scalability is NOT just "handling more traffic."

It means:
  ✓ Performance stays acceptable as load increases
  ✓ Cost grows proportionally (ideally sub-linearly) with load
  ✓ System doesn't require a full rewrite to grow
  ✓ You can scale individual components independently
```

### The Two Fundamental Approaches

#### Vertical Scaling (Scale Up)

Add more power to **the same machine** — more CPU, RAM, faster disks, better network.

```mermaid
flowchart TB
    N0["BEFORE: AFTER:"]
    N1["Server Server<br/>4 CPU Scale 32 CPU<br/>16 GB RAM -&gt; 256 GB RAM<br/>500 GB SSD Up 4 TB NVMe SSD<br/>1 Gbps NIC 10 Gbps NIC"]
    N2["$100/month $2,000/month<br/>Handles 1K QPS Handles 10K QPS"]
    N0 --> N1
    N1 --> N2
```

#### Horizontal Scaling (Scale Out)

Add **more machines** of similar size and distribute the load across them.

```mermaid
flowchart TB
    N0["BEFORE: AFTER:"]
    N1["Server Server 1 Server 2 Server 3<br/>4 CPU Scale 4 CPU 4 CPU 4 CPU<br/>16 GB RAM -&gt; 16GB RAM 16GB RAM 16GB RAM<br/>Handles Out<br/>1K QPS<br/>up up up"]
    N2["Load<br/>Balancer"]
    N3["Total: 3K QPS<br/>Cost: $300/month"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

### Head-to-Head Comparison

| Dimension | Vertical Scaling | Horizontal Scaling |
|-----------|-----------------|-------------------|
| **How** | Bigger machine | More machines |
| **Complexity** | Simple (no code changes) | Complex (distributed system) |
| **Cost curve** | Exponential (diminishing returns) | Linear (ideally) |
| **Limit** | Hardware ceiling (single machine max) | No theoretical limit |
| **Downtime** | Usually requires restart | Zero-downtime (add nodes live) |
| **Failure** | Single point of failure | Redundancy built-in |
| **Data consistency** | Easy (single machine) | Hard (distributed state) |
| **Best for** | Databases, legacy apps | Stateless web servers, microservices |
| **Example** | Upgrade DB server to 128 cores | Add 5 more API servers behind LB |

### Cost Curves

```mermaid
flowchart TB
    N0["Cost up<br/>Vertical<br/>╱ (exponential)<br/>╱<br/>╱<br/>╱ Horizontal<br/>╱ ╱ (linear)<br/>╱ ╱<br/>╱ ╱<br/>╱ ╱<br/>╱ ╱<br/>╱ ╱<br/>&gt; Capacity"]
    N1["Vertical: 2× capacity ≠ 2× cost (often 4–10× cost)<br/>Horizontal: 2× capacity ≈ 2× cost (ideally)"]
    N0 --> N1
```

### What Makes Scaling Hard?

#### Stateful vs Stateless

```mermaid
flowchart TB
    N0["STATELESS SERVICE (Easy to scale):"]
    N1["Server 1 &lt;- Any request can go to any server<br/>No state because no server stores user-specific data"]
    N2["Server 2 &lt;- Each server is interchangeable<br/>No state"]
    N3["STATEFUL SERVICE (Hard to scale):"]
    N4["Server 1 &lt;- User A's session is HERE<br/>Session: User A If Server 1 dies, session is lost<br/>Cart: [item1] Requests must be routed to THIS server"]
    N5["Server 2 &lt;- User B's session is HERE<br/>Session: User B Can't just add servers freely<br/>Cart: [item2,3]"]
    N6["Solution: Move state OUT of the app server"]
    N7["Server 1 Server 2 &lt;- Stateless, interchangeable<br/>No state No state"]
    N8["Redis &lt;- Sessions stored externally<br/>(Shared) Any server can access any session"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
    N7 --> N8
```

#### The Scaling Dimensions

A system has multiple bottlenecks. You must identify **which dimension** needs scaling:

| Dimension | Symptom | Solution |
|-----------|---------|----------|
| **Compute (CPU)** | High CPU utilization, slow processing | More/faster servers, optimize algorithms |
| **Memory (RAM)** | OOM errors, swapping, cache evictions | More RAM, better data structures, eviction policies |
| **Storage (Disk)** | Disk full, slow I/O | Larger disks, sharding, archival, compression |
| **Network (Bandwidth)** | High latency, packet loss | CDN, compression, protocol optimization |
| **Database (Queries)** | Slow queries, connection pool exhausted | Read replicas, caching, sharding, indexing |
| **Connections** | "Too many connections" errors | Connection pooling, async I/O |

### Scaling Strategies by Component

```mermaid
flowchart TB
    N0["SCALING STRATEGIES"]
    N1["CLIENT CDN for static assets<br/>Client-side caching<br/>Compression (gzip/brotli)"]
    N2["CDN Edge caching<br/>Geographic distribution<br/>Static + dynamic content caching"]
    N3["LOAD Horizontal scaling (multiple LBs)<br/>BALANCER L4 vs L7 based on needs<br/>Health checks + failover"]
    N4["APP Horizontal scaling (stateless!)<br/>SERVERS Auto-scaling based on CPU/QPS<br/>Container orchestration (K8s)"]
    N5["CACHE Distributed cache (Redis Cluster)<br/>Multi-layer (L1 in-proc + L2 distributed)<br/>Cache warming, eviction policies"]
    N6["DATABASE Read replicas (scale reads)<br/>Sharding (scale writes)<br/>Connection pooling<br/>Denormalization"]
    N7["QUEUE Partitioning (Kafka partitions)<br/>Consumer groups<br/>Backpressure"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
```

### Database Scaling Deep Dive

Databases are usually the **hardest component to scale** because they are stateful.

#### Read Scaling: Replicas

```mermaid
flowchart TB
    N0["Writes -&gt; Primary<br/>(Leader)"]
    N1["Replication"]
    N2["Reads -&gt; Replica 1 Replica2 Replica 3<br/>(Follower) (Follower) (Follower)"]
    N3["Pros: Read throughput scales linearly with replicas<br/>Cons: Replication lag -&gt; stale reads (eventual consistency)<br/>Cons: Writes don't scale (still single primary)"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

#### Write Scaling: Sharding (Partitioning)

```mermaid
flowchart TB
    N0["Router<br/>(Shard key<br/>&gt; shard)"]
    N1["Shard 1 Shard 2 Shard 3<br/>Users A-H Users I-P Users Q-Z"]
    N2["Primary + Primary + Primary +<br/>Replicas Replicas Replicas"]
    N3["Pros: Both reads AND writes scale<br/>Cons: Cross-shard queries are expensive<br/>Cons: Resharding is painful (adding/removing shards)<br/>Cons: Choosing the right shard key is critical"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

#### Shard Key Selection

| Strategy | How | Pros | Cons | Example |
|----------|-----|------|------|---------|
| **Range-based** | user_id 1-1M → Shard 1, 1M-2M → Shard 2 | Range queries easy | Hot spots if data is uneven | Time-series data |
| **Hash-based** | hash(user_id) % N → Shard N | Even distribution | Range queries impossible | User data |
| **Geographic** | US → Shard 1, EU → Shard 2 | Data locality | Uneven load if one region dominates | Global apps |
| **Directory-based** | Lookup table maps key → shard | Flexible | Lookup table is a bottleneck/SPOF | Complex routing |

### Auto-Scaling

Modern cloud platforms can automatically add/remove capacity:

```mermaid
flowchart TB
    N0["Auto-Scaling Configuration:<br/>Metric: CPU Utilization<br/>Target: 60%<br/>Min: 2 instances<br/>Max: 20 instances<br/>Cooldown: 300 seconds (5 min between scale actions)<br/>Scale-up: +2 instances when CPU &gt; 70% for 2 min<br/>Scale-down: -1 instance when CPU &lt; 40% for 10 min"]
    N1["Traffic up"]
    N2["&gt; Time<br/>6am 12pm 6pm 12am"]
    N3["Instances up"]
    N4["&gt; Time<br/>2 8 4 10 6 3"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
```

### Scalability Anti-Patterns

| Anti-Pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| **Storing sessions in app server** | Can't add/remove servers freely | Use external session store (Redis) |
| **Single database for everything** | DB becomes the bottleneck | Read replicas, sharding, caching |
| **Synchronous everything** | One slow service blocks the chain | Async processing via message queues |
| **Fat services** | Can't scale hot path independently | Split into focused microservices |
| **Hard-coded connection limits** | Can't handle traffic spikes | Dynamic connection pooling |
| **No caching** | Every request hits the database | Multi-layer caching strategy |
| **Monolithic deployment** | Must scale the entire app even if only search is hot | Independently deployable services |
| **Tight coupling** | Scaling one service requires scaling its dependencies | Loose coupling via APIs and queues |
| **Premature scaling** | Over-engineering for load you don't have yet | Scale when needed, not before |
| **Ignoring the database** | App servers scale but DB doesn't | Always plan DB scaling strategy |

### Amdahl's Law — The Scaling Limit

Not everything can be parallelized. **Amdahl's Law** defines the theoretical speedup limit:

```mermaid
flowchart TB
    N0["Speedup = 1 / (S + (1-S)/N)"]
    N1["Where:<br/>S = fraction of work that is sequential (can't be parallelized)<br/>N = number of processors/servers"]
    N2["Example: If 10% of your system is sequential (S = 0.1):<br/>N=2: Speedup = 1/(0.1 + 0.9/2) = 1.82×<br/>N=4: Speedup = 1/(0.1 + 0.9/4) = 3.08×<br/>N=10: Speedup = 1/(0.1 + 0.9/10) = 5.26×<br/>N=100: Speedup = 1/(0.1 + 0.9/100)= 9.17×<br/>N=∞: Speedup = 1/0.1 = 10× &lt;- MAX (can never exceed this!)"]
    N3["Speedup up<br/>10× Theoretical max (10% sequential)<br/>╱<br/>8× ╱<br/>╱<br/>6× ╱<br/>╱<br/>4× ╱<br/>╱<br/>2× ╱<br/>&gt; Number of servers (N)<br/>1 4 8 16 32 64 128"]
    N4["Lesson: Identify and eliminate sequential bottlenecks BEFORE<br/>throwing more hardware at the problem."]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
```

### Common Sequential Bottlenecks

| Bottleneck | Why Sequential | Mitigation |
|-----------|---------------|-----------|
| **Single DB primary for writes** | All writes go through one node | Sharding, write batching |
| **Global locks** | Only one thread can proceed | Fine-grained locks, lock-free algorithms |
| **Leader election** | One leader coordinates | Reduce leader responsibilities |
| **Sequential ID generation** | Must be globally unique + ordered | Snowflake IDs (distributed) |
| **Synchronous API chains** | A must finish before B starts | Async processing, parallel calls |

---

## B. Interview View

### How Scalability Appears in Interviews

Scalability is discussed in **every** system design interview. The interviewer wants to see:

1. You can estimate the scale (QPS, storage, bandwidth)
2. You start with a simple design and **evolve it** to handle more load
3. You know which components to scale and how
4. You understand the trade-offs of each scaling approach

### The Scaling Narrative (How to Present It)

```
Step 1: Start simple
  "Let's start with a single server handling all requests..."

Step 2: Identify the bottleneck
  "At 10K QPS, the database becomes the bottleneck because
   each query takes 5ms and we can do ~200 QPS per connection..."

Step 3: Apply targeted scaling
  "I'd add a Redis cache layer. With 90% cache hit rate,
   only 1K QPS actually hits the database..."

Step 4: Anticipate the next bottleneck
  "When we reach 100K QPS, the app servers become the bottleneck.
   I'd add a load balancer with auto-scaling..."

Step 5: Discuss trade-offs
  "Caching gives us speed but we need to handle cache invalidation
   and accept eventual consistency for product data..."
```

### What Interviewers Expect by Level

| Level | Expectation |
|-------|------------|
| **Junior** | Knows vertical vs horizontal; can say "add more servers" |
| **Mid** | Can identify which component to scale; knows caching, replicas, sharding |
| **Senior** | Designs the full scaling path; discusses trade-offs, Amdahl's Law, auto-scaling |
| **Staff+** | Considers cost efficiency, organizational scaling, data model implications, failure modes at each scale |

### Red Flags

- "Just add more servers" without identifying the actual bottleneck
- Not mentioning database scaling (it's always the hardest part)
- Suggesting sharding without discussing the shard key strategy
- Ignoring the stateful vs stateless distinction
- Not considering cost (over-scaling wastes money)
- Scaling before understanding the current bottleneck
- Not mentioning caching as a scaling strategy

### Common Follow-up Questions

1. "How would you scale this from 1K to 1M QPS?"
2. "What's the first bottleneck you'd hit and how would you address it?"
3. "When would you shard the database? How would you choose the shard key?"
4. "What's the difference between vertical and horizontal scaling?"
5. "How do you handle session state when you scale horizontally?"
6. "What is Amdahl's Law and how does it apply here?"
7. "How would you auto-scale this system? What metrics would you use?"
8. "What happens to the database as you add more app servers?"

---

## C. Practical Engineering View

### Scaling Journey — From 0 to 10M Users

```mermaid
flowchart TB
    N0["Stage 1: Single Server (0 – 1K users)"]
    N1["Single Server"]
    N2["Web App DB<br/>Server Logic"]
    N3["Cost: $20/month"]
    N4["Stage 2: Separate DB (1K – 10K users)"]
    N5["App -&gt; DB<br/>Server (Managed)"]
    N6["Cost: $50/month + $100/month (RDS)"]
    N7["Stage 3: Add Cache + CDN (10K – 100K users)"]
    N8["Client -&gt; CDN -&gt; App Server -&gt; Redis -&gt; DB"]
    N9["Cost: ~$500/month total"]
    N10["Stage 4: Load Balancer + Multiple Servers (100K – 1M users)"]
    N11["Client -&gt; CDN -&gt; LB -&gt; Servers ×3 -&gt; Redis -&gt; DB<br/>Cluster +Read<br/>Replica"]
    N12["Cost: ~$2,000/month"]
    N13["Stage 5: Sharding + Microservices (1M – 10M users)"]
    N14["Client -&gt; CDN -&gt; LB -&gt; API -&gt; Redis -&gt; DB Shards<br/>Gateway Cluster (3 shards)"]
    N15["Auth Product Order<br/>Service Service Service"]
    N16["Cost: ~$10,000-30,000/month"]
    N17["Stage 6: Multi-Region (10M+ users)<br/>+ Global DNS routing<br/>+ Region-local app servers + caches + DB replicas<br/>+ Cross-region replication for writes<br/>Cost: $50,000-200,000+/month"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
    N7 --> N8
    N8 --> N9
    N9 --> N10
    N10 --> N11
    N11 --> N12
    N12 --> N13
    N13 --> N14
    N14 --> N15
    N15 --> N16
    N16 --> N17
```

### Real-World Scaling Numbers

| Company | Scale | Architecture | Key Technique |
|---------|-------|-------------|---------------|
| **Stack Overflow** | 1.3B page views/month | Monolith on 9 servers | Aggressive caching, SQL Server optimization |
| **Instagram** | 2B+ MAU | Django + Cassandra + Redis | Sharding, CDN, async processing |
| **Discord** | 7M+ concurrent users | Rust + Cassandra + Redis | Custom data structures, Rust for performance |
| **Netflix** | 250M+ subscribers | 1000+ microservices on AWS | Regional failover, chaos engineering |
| **Twitter/X** | 500M+ tweets/day | Hybrid fan-out (push + pull) | Manhattan DB, custom caching |

### Operational Concerns at Scale

#### Deployment at Scale

| Scale | Deployment Strategy |
|-------|-------------------|
| 1 server | SSH + restart |
| 5-20 servers | Ansible/Chef, rolling deploy |
| 50+ servers | Kubernetes, blue-green or canary |
| 500+ servers | Progressive rollout (1% → 5% → 25% → 100%) |
| Multi-region | Region-by-region rollout |

#### Monitoring at Scale

```
Monitoring stack grows with scale:

Small (< 10 servers):
  - Basic health checks
  - CloudWatch / simple Grafana
  - Email alerts

Medium (10-100 servers):
  - Prometheus + Grafana
  - Centralized logging (ELK)
  - PagerDuty for on-call

Large (100+ servers):
  - Distributed tracing (Jaeger/Zipkin)
  - Real-time anomaly detection
  - SLO dashboards
  - Automated runbooks
  - Cost monitoring per service
```

#### Cost Optimization

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| **Reserved instances** | 30-60% vs on-demand | Commit for 1-3 years |
| **Spot instances** for batch jobs | 60-90% savings | Can be terminated anytime |
| **Right-sizing** | 20-40% | Requires monitoring and tuning |
| **Auto-scaling** | Variable | Need to handle cold starts |
| **Caching aggressively** | Reduce DB/compute costs | Cache invalidation complexity |
| **Data tiering** | Hot (SSD) → Warm (HDD) → Cold (S3) | Access latency for cold data |
| **Compression** | Reduce storage + bandwidth | CPU overhead |

### Failure Modes at Scale

| Scale | New Failure Modes |
|-------|------------------|
| **Single server** | Hardware failure, disk full |
| **Multi-server** | Network partition between servers, uneven load |
| **With cache** | Cache stampede, stale data, cache failure cascading to DB |
| **With sharding** | Hot shard, cross-shard failures, resharding downtime |
| **Multi-region** | Cross-region latency spikes, split-brain, data divergence |
| **At massive scale** | Correlated failures (entire AZ down), dependency cascades, noisy neighbors |

---

## D. Example: Scaling a URL Shortener (100 → 100M Users)

### Phase 1: MVP (100 users)

```mermaid
flowchart TB
    N0["Client -&gt; Single Server"]
    N1["&lt;- App SQLite<br/>(Flask)"]
    N2["Create short URL: POST /shorten {url: &quot;https://example.com/very-long-path&quot;}<br/>Redirect: GET /abc123 -&gt; 301 Redirect to original URL"]
    N3["QPS: ~1 req/sec<br/>Storage: ~1000 URLs = negligible<br/>Cost: $5/month (shared hosting)"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

### Phase 2: Growing (10K users, 100 URLs/day)

```mermaid
flowchart TB
    N0["Client -&gt; App -&gt; PostgreSQL<br/>Server (RDS)"]
    N1["Changes:<br/>Moved from SQLite to PostgreSQL (managed RDS)<br/>Added proper indexing on short_code column<br/>HTTPS enabled"]
    N2["QPS: ~10 req/sec<br/>Storage: 100K URLs × 500 bytes = 50 MB<br/>Cost: $50/month"]
    N0 --> N1
    N1 --> N2
```

### Phase 3: Scaling Reads (1M users, 10K redirects/sec)

```mermaid
flowchart TB
    N0["Client -&gt; CDN -&gt; LB -&gt; Redis PostgreSQL<br/>(cache 301 Cache<br/>redirects) Primary +<br/>App ×3 2 Read<br/>Replicas"]
    N1["Changes:<br/>CDN caches redirect responses (huge win — 301s are highly cacheable)<br/>Redis cache for URL lookups (read:write ratio is ~100:1)<br/>3 app servers behind load balancer<br/>PostgreSQL read replicas for analytics queries"]
    N2["Cache hit rate: 95% (popular URLs are cached)<br/>Effective DB QPS: 10K × 0.05 = 500 QPS (manageable)"]
    N3["QPS: 10K req/sec<br/>Storage: 10M URLs × 500 bytes = 5 GB<br/>Cost: $500/month"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

### Phase 4: Scaling Writes + Global (100M users, 100K redirects/sec)

```mermaid
flowchart TB
    N0["Global DNS<br/>(Geo-routing)"]
    N1["US Region EU Region Asia Region"]
    N2["(Each region has:)"]
    N3["CDN LB + App Redis<br/>×5 nodes Cluster"]
    N4["DB Shard (by hash of<br/>short_code)<br/>Shard 1 | Shard 2 |..."]
    N5["Changes:<br/>Sharded database by hash(short_code) % N<br/>Distributed ID generation (Snowflake-like) for unique short codes<br/>Multi-region deployment with geo-routing<br/>Redis Cluster (not just single Redis)<br/>Kafka for analytics events (don't block the redirect path)"]
    N6["Write path: Generate short code -&gt; Write to correct shard (async analytics via Kafka)<br/>Read path: CDN hit (60%) -&gt; Redis hit (35%) -&gt; DB hit (5%)"]
    N7["QPS: 100K reads/sec, 1K writes/sec<br/>Storage: 1B URLs × 500 bytes = 500 GB (across shards)<br/>Cost: $20,000-50,000/month"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
```

### Scaling Decisions Summary

| Phase | Users | QPS | Key Scaling Move | Cost |
|-------|-------|-----|-----------------|------|
| 1 | 100 | 1 | Single server | $5/mo |
| 2 | 10K | 10 | Managed DB | $50/mo |
| 3 | 1M | 10K | CDN + Cache + LB + Replicas | $500/mo |
| 4 | 100M | 100K | Sharding + Multi-region + Kafka | $20K+/mo |

---

## E. HLD and LLD

### E.1 HLD — Auto-Scaling E-Commerce Platform

#### Requirements

**Functional:**
- Product catalog browsing and search
- User authentication
- Order placement
- Handle flash sales (10× normal traffic for 30 min)

**Non-Functional:**
- Normal: 10K QPS, Peak (flash sale): 100K QPS
- p99 < 200ms during normal, < 500ms during flash sales
- 99.9% availability
- Cost-efficient (don't over-provision for flash sale capacity 24/7)

#### Capacity Estimation

```
Normal load:
  DAU: 5M, QPS: 10K, Peak: 20K
  DB: 2K writes/sec, 8K reads/sec

Flash sale load (10×):
  QPS: 100K (bursts), sustained: 60K
  DB: 20K writes/sec (order creation), 40K reads/sec
  
Need to handle 10× traffic increase within 2 minutes.
```

#### Architecture with Auto-Scaling

```mermaid
flowchart TB
    N0["CDN WAF Auto-Scaling Group<br/>(cached (DDoS ...<br/>assets) protect) App1 App2 App3 AppN"]
    N1["Min: 3 Max: 30<br/>Scale on: CPU &gt; 60%<br/>QPS &gt; 3K/instance"]
    N2["ALB"]
    N3["ElastiCache Database Layer<br/>Redis Cluster"]
    N4["Node1 Node2 Primary Read Replicas<br/>(writes)<br/>Auto-scaling R1 R2"]
    N5["Auto-scaling"]
    N6["SQS / Kafka Lambda / Workers<br/>(Order Queue) -&gt; (Order Process)<br/>Buffer during Auto-scaled<br/>flash sales consumers"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
```

#### Flash Sale Strategy

```mermaid
flowchart TB
    N0["Before Flash Sale:<br/>1. Pre-warm caches (product data, inventory counts)<br/>2. Pre-scale app servers to 15 instances (anticipate traffic)<br/>3. Set up rate limiting per user (max 5 req/sec)<br/>4. Enable write queue (orders go to SQS, processed async)<br/>5. Switch to eventual consistency for inventory display"]
    N1["During Flash Sale:"]
    N2["Request arrives:<br/>1. Rate limiter checks (user within limit?)<br/>2. CDN serves product page (cached)<br/>3. Redis has pre-warmed inventory count<br/>4. &quot;Buy&quot; request -&gt; SQS queue (not direct DB)<br/>5. Worker processes orders from queue<br/>Atomic decrement inventory in Redis<br/>If stock &gt; 0: create order in DB<br/>If stock = 0: reject, notify user<br/>6. User gets 202 Accepted -&gt; polls for status"]
    N3["After Flash Sale:<br/>1. Auto-scaler gradually reduces instances<br/>2. Queue drains remaining orders<br/>3. Reconcile Redis inventory with DB<br/>4. Generate analytics report"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

#### Scaling Approach

| Component | Normal (3 instances) | Flash Sale (auto-scaled) | Scale Trigger |
|-----------|---------------------|-------------------------|---------------|
| **App Servers** | 3 | 15-30 | CPU > 60% or QPS > 3K/instance |
| **Redis** | 2-node cluster | 6-node cluster | Memory > 70% |
| **DB Read Replicas** | 2 | 5 | Replication lag > 100ms |
| **Order Workers** | 2 | 10-20 | Queue depth > 1000 |
| **Rate Limit** | 10 req/sec/user | 5 req/sec/user | Flash sale mode |

#### Trade-offs

| Decision | Chosen | Alternative | Why |
|----------|--------|------------|-----|
| **Async orders (queue)** | Yes, during flash sales | Synchronous order creation | Absorb traffic spikes; prevent DB overload |
| **Redis for inventory** | Atomic decrement in Redis | DB row-level lock | Redis handles 100K+ ops/sec; DB can't |
| **Pre-scaling** | Yes, before flash sale | Purely reactive auto-scaling | Auto-scaling takes 2-5 min; flash traffic is instant |
| **202 Accepted** for orders | Yes | Synchronous 201 Created | Don't block the user while order is queued |
| **Eventual consistency** on inventory display | Yes during flash | Strong consistency | Performance > accuracy for display count during spike |

---

### E.2 LLD — Auto-Scaler Decision Engine

#### Classes and Components

```mermaid
flowchart TB
    N0["AutoScaler"]
    N1["config: ScalingConfig<br/>metricsProvider: Metrics<br/>cloudProvider: CloudAPI<br/>currentInstances: int<br/>lastScaleAction: datetime"]
    N2["+ evaluate(): ScalingDecision<br/>+ scaleUp(count: int): void<br/>+ scaleDown(count: int): void<br/>+ getCooldownRemaining(): int"]
    N3["Metrics Scaling CloudProvider<br/>Provider Policy (Interface)"]
    N4["+getCPU +evaluate +launchInstance<br/>+getQPS (metrics +terminateInst<br/>+getMem ): Dec +listInstances<br/>+custom +getHealth"]
    N5["AWS GCP Azure<br/>Provider Provider Provider"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
```

#### Data Models

```java
public class ScalingConfig {
    private String serviceName;
    private int minInstances;          // Never go below this
    private int maxInstances;          // Never exceed this
    private int cooldownSeconds;       // Wait between scale actions
    private double scaleUpThreshold;   // e.g., CPU > 70%
    private double scaleDownThreshold; // e.g., CPU < 40%
    private int scaleUpStep;           // How many to add (e.g., 2)
    private int scaleDownStep;         // How many to remove (e.g., 1)
    private int scaleUpEvaluationPeriods;   // Must exceed for N periods
    private int scaleDownEvaluationPeriods; // Must be below for N periods
    private String metric;             // "cpu", "qps", "memory", "custom"
    // getters and setters
}

public class ScalingDecision {
    private String action;     // "scale_up", "scale_down", "no_action"
    private String reason;     // Human-readable explanation
    private int current;       // Current instance count
    private int target;        // Desired instance count
    private double metricValue;
    private double threshold;
    private LocalDateTime timestamp;
    // getters and setters
}

public class ScalingEvent {
    private String eventId;
    private String serviceName;
    private String action;
    private int fromCount;
    private int toCount;
    private String triggerMetric;
    private double triggerValue;
    private LocalDateTime timestamp;
    private boolean success;
    private String error;
    // getters and setters
}
```

```sql
-- Scaling events log
CREATE TABLE scaling_events (
    id              BIGSERIAL PRIMARY KEY,
    service_name    VARCHAR(100) NOT NULL,
    action          VARCHAR(20) NOT NULL,      -- 'scale_up', 'scale_down'
    from_count      INT NOT NULL,
    to_count        INT NOT NULL,
    trigger_metric  VARCHAR(50),
    trigger_value   DECIMAL(10,2),
    timestamp       TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP,
    success         BOOLEAN DEFAULT FALSE,
    error_message   TEXT
);

CREATE INDEX idx_scaling_events_service ON scaling_events(service_name, timestamp DESC);
```

#### Pseudocode — Auto-Scaler

```java
public class AutoScaler {
    private final ScalingConfig config;
    private final MetricsProvider metrics;
    private final CloudProvider cloud;
    private LocalDateTime lastScaleTime;
    private int highReadings = 0;
    private int lowReadings = 0;

    public AutoScaler(ScalingConfig config, MetricsProvider metrics, CloudProvider cloud) {
        this.config = config; this.metrics = metrics; this.cloud = cloud;
    }

    /** Called every 30 seconds by scheduler */
    public ScalingDecision evaluate() {
        // 1. Check cooldown
        if (lastScaleTime != null && !cooldownExpired())
            return new ScalingDecision("no_action", "Cooldown active");

        // 2. Get current metrics
        List<Instance> currentInstances = cloud.listInstances(config.getServiceName());
        double metricValue = getMetricValue();

        // 3. Evaluate scale-up
        if (metricValue > config.getScaleUpThreshold()) {
            highReadings++; lowReadings = 0;
            if (highReadings >= config.getScaleUpEvaluationPeriods()) {
                int target = Math.min(
                    currentInstances.size() + config.getScaleUpStep(),
                    config.getMaxInstances());
                if (target > currentInstances.size())
                    return createDecision("scale_up", currentInstances.size(),
                        target, metricValue,
                        config.getMetric() + " (" + metricValue + ") > threshold");
            }
        // 4. Evaluate scale-down
        } else if (metricValue < config.getScaleDownThreshold()) {
            lowReadings++; highReadings = 0;
            if (lowReadings >= config.getScaleDownEvaluationPeriods()) {
                int target = Math.max(
                    currentInstances.size() - config.getScaleDownStep(),
                    config.getMinInstances());
                if (target < currentInstances.size())
                    return createDecision("scale_down", currentInstances.size(),
                        target, metricValue,
                        config.getMetric() + " (" + metricValue + ") < threshold");
            }
        } else {
            highReadings = 0; lowReadings = 0;
        }
        return new ScalingDecision("no_action", "Within thresholds");
    }

    /** Execute a scaling decision */
    public void execute(ScalingDecision decision) {
        if ("no_action".equals(decision.getAction())) return;
        try {
            if ("scale_up".equals(decision.getAction())) {
                int count = decision.getTarget() - decision.getCurrent();
                for (int i = 0; i < count; i++) {
                    cloud.launchInstance(config.getServiceName());
                    waitForHealthy(120);
                }
            } else if ("scale_down".equals(decision.getAction())) {
                int count = decision.getCurrent() - decision.getTarget();
                List<Instance> toTerminate = selectForTermination(count);
                for (Instance inst : toTerminate) {
                    cloud.drainConnections(inst, 30);
                    cloud.terminateInstance(inst);
                }
            }
            lastScaleTime = LocalDateTime.now();
            logEvent(decision, true, null);
        } catch (Exception e) {
            logEvent(decision, false, e.getMessage());
            throw e;
        }
    }

    private double getMetricValue() {
        switch (config.getMetric()) {
            case "cpu": return metrics.getAvgCpu(config.getServiceName());
            case "qps":
                int count = cloud.listInstances(config.getServiceName()).size();
                return metrics.getTotalQps(config.getServiceName()) / count;
            case "memory": return metrics.getAvgMemory(config.getServiceName());
            default: return 0;
        }
    }

    private boolean cooldownExpired() {
        return Duration.between(lastScaleTime, LocalDateTime.now()).getSeconds()
            > config.getCooldownSeconds();
    }

    private List<Instance> selectForTermination(int count) {
        List<Instance> instances = new ArrayList<>(cloud.listInstances(config.getServiceName()));
        instances.sort(Comparator.comparingInt(Instance::getActiveConnections));
        return instances.subList(0, Math.min(count, instances.size()));
    }
}
```

#### Edge Cases

| Edge Case | How to Handle |
|-----------|--------------|
| Scale-up during cooldown but traffic is critical | Have an "emergency override" that bypasses cooldown |
| Cloud API rate limited | Exponential backoff on cloud API calls; batch requests |
| New instance fails health check | Retry launch; if repeated, alert on-call; don't count as scaled |
| Scale-down removes instance mid-request | Connection draining: stop new requests, finish in-flight, then terminate |
| Flapping (rapid scale up/down cycles) | Asymmetric cooldowns: 2 min for scale-up, 10 min for scale-down |
| All instances in one AZ go down | Spread across multiple AZs; auto-scaler launches in healthy AZ |
| Metric provider is down | Use last known good value; alert if stale > 5 min; don't scale on stale data |
| Max instances reached but still overloaded | Alert on-call; consider increasing max; enable aggressive rate limiting |
| Cost runaway (auto-scaled to 100 instances) | Budget alerts; hard max cap; require approval for > N instances |

---

## F. Summary & Practice

### Key Takeaways

1. **Scalability** = handling more load by adding resources proportionally, without degradation
2. **Vertical scaling** (bigger machine) is simple but has limits; **horizontal scaling** (more machines) is complex but unlimited
3. **Stateless services** are trivial to scale horizontally; move state to external stores (Redis, DB)
4. **Database is usually the hardest to scale** — use caching → read replicas → sharding (in that order)
5. **Amdahl's Law**: sequential bottlenecks limit parallel scaling — find and eliminate them first
6. **Auto-scaling** handles traffic variability but has lag — pre-scale for predictable spikes
7. **Caching is the single most effective scaling technique** — can reduce DB load by 90-99%
8. **Scale incrementally**: single server → separate DB → cache → LB + replicas → sharding → multi-region
9. **Cost grows with scale** — use reserved instances, spot instances, and right-sizing to optimize
10. **Don't scale prematurely** — understand your bottleneck before adding complexity

### Revision Checklist

- [ ] Can I explain vertical vs horizontal scaling with trade-offs?
- [ ] Can I explain why stateless services are easier to scale?
- [ ] Do I know the scaling order: cache → replicas → sharding?
- [ ] Can I explain database read replicas and sharding with diagrams?
- [ ] Can I list 4 shard key strategies and their trade-offs?
- [ ] Can I explain Amdahl's Law and identify sequential bottlenecks?
- [ ] Can I describe how auto-scaling works (metrics, thresholds, cooldown)?
- [ ] Can I walk through scaling from 1 server to multi-region?
- [ ] Do I know 5 scalability anti-patterns?
- [ ] Can I estimate the cost at different scale tiers?
- [ ] Can I design a flash-sale scaling strategy (pre-scale, queue, rate limit)?

### Interview Questions

**Conceptual:**

1. What is scalability? How do you measure it?
2. Compare vertical vs horizontal scaling. When would you use each?
3. Why are stateless services easier to scale than stateful ones?
4. What is Amdahl's Law? Give a practical example.
5. What's the difference between read replicas and sharding?

**Design & Strategy:**

6. Walk me through how you'd scale a system from 1K to 10M users.
7. How would you handle a flash sale that brings 10× normal traffic?
8. When would you shard a database? How would you choose the shard key?
9. What caching strategy would you use to reduce DB load by 95%?
10. How would you design auto-scaling for a web application?

**Operational:**

11. What metrics would you use to trigger auto-scaling?
12. How do you handle the "thundering herd" problem when cache expires?
13. What are the failure modes unique to sharded databases?
14. How do you ensure zero-downtime deployments at scale?
15. How do you optimize cloud costs when running at large scale?

### Practice Exercises

1. **Exercise 1**: Draw the architecture for a URL shortener at each scale: 100 users, 10K users, 1M users, 100M users. List what changes at each stage and why.

2. **Exercise 2**: Your PostgreSQL database handles 5K QPS. You need to scale to 50K QPS. 80% of queries are reads. Design the scaling strategy. Calculate how many read replicas you need if each handles 5K QPS. What about the remaining 20% writes?

3. **Exercise 3**: A flash sale starts in 2 hours. Normal traffic is 10K QPS; expected peak is 200K QPS for 15 minutes. Your auto-scaler takes 3 minutes to add instances. Design the complete scaling plan (pre-scaling, queuing, rate limiting, cache warming).

4. **Exercise 4**: Your system has a sequential bottleneck: a single Redis instance doing 50K ops/sec for distributed locking. Using Amdahl's Law, calculate the max throughput improvement from adding 10 more app servers. How would you eliminate the bottleneck?

5. **Exercise 5**: Build a cost model for a system at 3 scale tiers (10K QPS, 100K QPS, 1M QPS). List every component (servers, DB, cache, CDN, LB, queue) and estimate monthly cost on AWS. Find the cost-per-request at each tier.

---

> **Previous**: [04 — Latency vs Throughput](04-latency-vs-throughput.md)
> **Next**: [06 — Availability and Reliability](06-availability-and-reliability.md)
