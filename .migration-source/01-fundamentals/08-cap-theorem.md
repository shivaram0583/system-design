# Topic 8: CAP Theorem

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–7 (especially Consistency and Availability)

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

### The CAP Theorem

The CAP theorem (Brewer's theorem, 2000) states that a distributed system can provide at most **two out of three** guarantees simultaneously:

```
        Consistency (C)
            ╱╲
           ╱  ╲
          ╱ CP ╲
         ╱      ╲
        ╱________╲
       ╱╲        ╱╲
      ╱  ╲  CA  ╱  ╲
     ╱ AP ╲    ╱    ╲
    ╱______╲  ╱______╲
  Availability (A)  Partition Tolerance (P)

You can pick TWO:
  CP = Consistency + Partition Tolerance (sacrifice Availability)
  AP = Availability + Partition Tolerance (sacrifice Consistency)
  CA = Consistency + Availability (sacrifice Partition Tolerance)
       ↑ Not practical in distributed systems (partitions WILL happen)
```

### The Three Guarantees

| Property | Meaning | In Practice |
|----------|---------|-------------|
| **Consistency (C)** | Every read returns the most recent write | All nodes see the same data at the same time |
| **Availability (A)** | Every request receives a response (not an error) | System always responds, even if data may be stale |
| **Partition Tolerance (P)** | System works despite network partitions | System operates even if messages between nodes are lost |

### Why You Must Choose P

In any real distributed system, **network partitions are inevitable** — cables get cut, switches fail, cloud AZs lose connectivity. Therefore:

```
REALITY: P (Partition Tolerance) is NOT optional.

Since P is required, the real choice is:

  CP: When partition happens → BLOCK requests until partition heals
      (maintain consistency, sacrifice availability)
  
  AP: When partition happens → SERVE requests with possibly stale data
      (maintain availability, sacrifice consistency)

┌──────────────────────────────────────────────────────────────┐
│  NETWORK PARTITION OCCURS:                                    │
│                                                                │
│  ┌────────┐         ✗ ✗ ✗        ┌────────┐                  │
│  │Node A  │ ════════╳═╳═╳════════│ Node B │                  │
│  │Data: X=5│   can't communicate  │Data: X=3│                  │
│  └────────┘                      └────────┘                  │
│                                                                │
│  Client asks Node B for X:                                    │
│                                                                │
│  CP choice: "Sorry, I can't confirm X is up to date.         │
│              Returning error 503." (Unavailable but consistent)│
│                                                                │
│  AP choice: "X = 3. (It might be stale, but here's a         │
│              response.)" (Available but potentially stale)     │
└──────────────────────────────────────────────────────────────┘
```

### CA — The Impossible Choice

CA (Consistency + Availability, no Partition Tolerance) is only possible in a **single-node** system or a system where the network never fails:

```
CA exists only for:
  • Single-node databases (PostgreSQL on one server)
  • Systems connected by a perfectly reliable network (doesn't exist)

The moment you have 2+ nodes communicating over a network,
partitions CAN happen, and you MUST choose CP or AP.
```

### CP Systems

Choose **consistency over availability** during partitions.

```
CP Behavior:
  Normal:    Both nodes serve reads and writes ✓
  Partition: Only the node with quorum serves requests
             Other node returns errors (unavailable)

Examples:
  • MongoDB (with majority write concern)
  • HBase
  • Redis (with WAIT)
  • ZooKeeper
  • etcd
  • Consul

Use when: Data correctness > uptime
  Banking: Better to show "Service unavailable" than wrong balance
  Inventory: Better to block orders than oversell
  Distributed locks: Must be correct or not available
```

### AP Systems

Choose **availability over consistency** during partitions.

```
AP Behavior:
  Normal:    Both nodes serve reads and writes ✓
  Partition: Both nodes continue serving requests
             Data may diverge (inconsistent)
             Conflict resolution needed when partition heals

Examples:
  • Cassandra (default)
  • DynamoDB (default)
  • CouchDB
  • Riak
  • DNS

Use when: Uptime > perfect accuracy
  Shopping cart: Better to show cart (maybe stale) than error
  Social media: Better to show feed (maybe missing a post) than 503
  DNS: Better to return cached IP than fail to resolve
```

### CAP in Practice — It's a Spectrum

CAP is not binary — modern systems offer **tunable consistency**:

```
TUNABLE CONSISTENCY:

  Cassandra:
    consistency_level = ONE      → AP (fastest, least consistent)
    consistency_level = QUORUM   → Between CP and AP
    consistency_level = ALL      → CP (slowest, most consistent)

  DynamoDB:
    ConsistentRead = false       → AP (eventually consistent, cheaper)
    ConsistentRead = true        → CP (strongly consistent, 2× cost)

  MongoDB:
    writeConcern: 1              → AP
    writeConcern: majority       → CP
    readConcern: local           → AP
    readConcern: linearizable    → CP
```

### PACELC — The Extended CAP

CAP only describes behavior **during partitions**. PACELC extends it:

```
PACELC:
  If Partition → choose A or C
  Else (normal operation) → choose Latency or Consistency

  PA/EL: During partition → Available; Normal → Low Latency
         Examples: Cassandra, DynamoDB (default)
         
  PA/EC: During partition → Available; Normal → Consistent
         Examples: Cosmos DB (with session consistency)
         
  PC/EL: During partition → Consistent; Normal → Low Latency
         Examples: MongoDB, BigTable
         
  PC/EC: During partition → Consistent; Normal → Consistent
         Examples: VoltDB, Spanner

  Most systems are PA/EL — optimized for speed in normal operation
  and availability during partitions.
```

### Real-World System Classifications

| System | CAP | PACELC | Notes |
|--------|-----|--------|-------|
| **PostgreSQL** (single) | CA | N/A | No partition tolerance (single node) |
| **PostgreSQL** (replicated) | CP | PC/EC | Sync replication blocks on partition |
| **MySQL** (replicated) | CP | PC/EC | Semi-sync replication |
| **Cassandra** | AP (default) | PA/EL | Tunable per query |
| **DynamoDB** | AP (default) | PA/EL | Strong reads available |
| **MongoDB** | CP (default) | PC/EC | Majority write concern |
| **Redis Cluster** | AP | PA/EL | Async replication by default |
| **CockroachDB** | CP | PC/EC | Always strongly consistent |
| **Spanner** | CP | PC/EC | TrueTime for external consistency |
| **ZooKeeper** | CP | PC/EC | Leader-based, blocks on partition |
| **Consul** | CP | PC/EC | Raft consensus |
| **Elasticsearch** | AP | PA/EL | Eventual by default |
| **Kafka** | CP (ISR) | PC/EC | In-sync replica set |

---

## B. Interview View

### How CAP Appears in Interviews

- "What CAP trade-off does your design make?"
- "What happens to your system during a network partition?"
- "Why did you choose Cassandra over PostgreSQL for this component?"

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Can state CAP theorem; knows CP vs AP |
| **Mid** | Can classify common databases; chooses correctly per use case |
| **Senior** | Discusses PACELC; tunable consistency; trade-offs within a single system |
| **Staff+** | Designs multi-model systems (CP for writes, AP for reads); discusses real partition scenarios |

### Red Flags

- Saying "I'll choose all three" (impossible)
- Not knowing that P is effectively mandatory
- Thinking CAP is binary (it's a spectrum in practice)
- Not connecting CAP to concrete system choices
- Ignoring CAP when picking databases

### Common Follow-up Questions

1. "Can you explain the CAP theorem?"
2. "Why can't you have all three?"
3. "Is your design CP or AP? Why?"
4. "What happens to your system during a network partition?"
5. "Why is Cassandra AP while MongoDB is CP?"
6. "What is PACELC and how does it extend CAP?"
7. "Can different parts of the same system make different CAP choices?"

---

## C. Practical Engineering View

### Making CAP Decisions per Component

A real system often makes **different CAP choices for different data**:

```
E-Commerce Platform:

  Payment Service:    CP (consistency critical — no double charges)
    → PostgreSQL with synchronous replication
    
  Product Catalog:    AP (availability matters — stale price OK for 1s)
    → Elasticsearch cluster with eventual consistency
    
  User Sessions:      AP (session loss = re-login, acceptable)
    → Redis cluster with async replication
    
  Inventory Count:    CP for purchase, AP for display
    → Redis atomic decrement for purchase (CP)
    → Cached approximate count for display (AP)
    
  Order Status:       CP (must be accurate)
    → PostgreSQL, read from primary
    
  Recommendations:    AP (stale recommendations are fine)
    → Cassandra with eventual consistency
```

### Handling Partitions in Practice

```
When a partition is detected:

1. DETECT the partition
   - Health check failures between nodes
   - Increased timeouts on cross-node calls
   - Split-brain detection (both nodes think they're primary)

2. DECIDE behavior (based on pre-configured policy)
   CP path: Reject writes, serve reads from quorum only
   AP path: Continue serving, queue writes for reconciliation

3. HEAL the partition
   - Reconnect nodes
   - Run anti-entropy repair (compare and fix differences)
   - Resolve conflicts (LWW, vector clocks, merge)

4. POST-PARTITION reconciliation
   - Replay queued writes
   - Verify data consistency across nodes
   - Alert if manual intervention needed
```

### Testing for Partition Tolerance

```
Tools for chaos testing partitions:
  • Toxiproxy — Inject network faults between services
  • tc (traffic control) — Linux network emulation
  • iptables — Block traffic between specific hosts
  • Chaos Monkey / Litmus — K8s-native chaos testing
  • Gremlin — SaaS chaos engineering platform

Test scenarios:
  1. Block traffic between app server and DB replica
  2. Simulate 50% packet loss between regions
  3. Add 500ms latency between services
  4. Complete network split between two AZs
  5. DNS resolution failure
```

---

## D. Example: Chat Application — CAP Choices

### Scenario

Real-time chat with 5M DAU, multi-region deployment.

### CAP Decisions

```
Message Delivery: AP
  Why: Better to deliver messages (maybe out of order) than show errors
  Implementation: Cassandra, eventual consistency
  Conflict: Messages from both sides during partition → merge by timestamp

User Online Status: AP
  Why: Stale "online" status is acceptable; "service unavailable" is not
  Implementation: Redis with async replication
  Worst case: User shows "online" when actually offline (minor annoyance)

Message Read Receipts: AP
  Why: Missing a read receipt is OK; blocking chat is not
  Implementation: Async update, eventual propagation

Group Membership: CP
  Why: Must be consistent (can't have users in a group they left)
  Implementation: PostgreSQL with strong consistency
  During partition: Group changes blocked, but existing groups still work

Payment (for premium features): CP
  Why: Financial correctness is critical
  Implementation: PostgreSQL, synchronous replication
  During partition: Premium purchases blocked (show "try again later")
```

### Architecture

```
┌───────────────────────────────────────────┐
│          Chat Application                  │
│                                            │
│  Messages: ──► Cassandra (AP)             │
│                Eventual consistency         │
│                Multi-region replication     │
│                                            │
│  Presence:  ──► Redis Cluster (AP)        │
│                Async replication            │
│                TTL-based (auto-expire)     │
│                                            │
│  Groups:    ──► PostgreSQL (CP)           │
│                Sync replication             │
│                Single-region primary       │
│                                            │
│  Payments:  ──► PostgreSQL (CP)           │
│                Synchronous writes           │
│                Strict consistency           │
└───────────────────────────────────────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Multi-Region Data Store with CAP Awareness

#### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Global Router                        │
│   Routes by: data type → CP or AP path               │
└──────────┬────────────────────────┬─────────────────┘
           │                        │
    ┌──────┴──────┐          ┌──────┴──────┐
    │  CP Path    │          │  AP Path    │
    │  (Strong)   │          │  (Eventual) │
    └──────┬──────┘          └──────┬──────┘
           │                        │
    ┌──────┴──────┐          ┌──────┴──────┐
    │ Raft/Paxos  │          │  Ring-based │
    │ Consensus   │          │  Replication│
    │             │          │             │
    │ ┌───┐┌───┐ │          │ ┌───┐┌───┐  │
    │ │ L ││ F │ │          │ │ R1││ R2│  │
    │ └───┘└───┘ │          │ └───┘└───┘  │
    │ ┌───┐      │          │ ┌───┐       │
    │ │ F │      │          │ │ R3│       │
    │ └───┘      │          │ └───┘       │
    └─────────────┘          └─────────────┘
    Leader + Followers        All peers equal
    Writes go to leader       Write to any node
    Blocks if no quorum       Always writable
```

#### Trade-offs

| Decision | Chosen | Why |
|----------|--------|-----|
| Separate CP and AP paths | Yes | Different data has different requirements |
| Raft for CP path | Over Paxos | Simpler, well-understood, etcd/Consul proven |
| Gossip for AP path | Over consensus | Faster, no leader bottleneck |
| Conflict resolution: LWW | For AP path | Simple; acceptable for the data types using AP |

### E.2 LLD — Partition Detector

#### Pseudocode

```java
public class PartitionDetector {
    private final List<Peer> peers;
    private final int checkIntervalSec;
    private final int failureThreshold;
    private final Map<Peer, Integer> failureCounts = new HashMap<>();
    private final Set<Peer> partitionedPeers = new HashSet<>();
    private final List<BiConsumer<String, Peer>> listeners = new ArrayList<>();

    public PartitionDetector(List<Peer> peers, int checkIntervalSec, int failureThreshold) {
        this.peers = peers; this.checkIntervalSec = checkIntervalSec;
        this.failureThreshold = failureThreshold;
        peers.forEach(p -> failureCounts.put(p, 0));
    }

    public void onPartition(BiConsumer<String, Peer> callback) {
        listeners.add(callback);
    }

    /** Called every checkIntervalSec */
    public void checkPeers() {
        for (Peer peer : peers) {
            try {
                peer.ping(2000);
                failureCounts.put(peer, 0);
                if (partitionedPeers.remove(peer)) notify("HEALED", peer);
            } catch (TimeoutException e) {
                failureCounts.merge(peer, 1, Integer::sum);
                if (failureCounts.get(peer) >= failureThreshold
                        && partitionedPeers.add(peer))
                    notify("PARTITIONED", peer);
            }
        }
    }

    public boolean isPartitioned() { return !partitionedPeers.isEmpty(); }

    public List<Peer> getReachablePeers() {
        return peers.stream().filter(p -> !partitionedPeers.contains(p)).toList();
    }

    public boolean isQuorumAvailable(int quorumSize) {
        return getReachablePeers().size() >= quorumSize;
    }

    private void notify(String eventType, Peer peer) {
        listeners.forEach(l -> l.accept(eventType, peer));
    }
}

/** Routes requests based on partition status and CAP policy */
public class CAPPolicyRouter {
    private final PartitionDetector detector;
    private final String policy; // "CP" or "AP"

    public CAPPolicyRouter(PartitionDetector detector, String policy) {
        this.detector = detector; this.policy = policy;
    }

    public Object handleRead(String key) {
        if (detector.isPartitioned()) {
            if ("CP".equals(policy)) {
                if (detector.isQuorumAvailable(2)) return quorumRead(key);
                else throw new UnavailableException("No quorum during partition");
            } else { return localRead(key); } // AP — may be stale
        }
        return normalRead(key);
    }

    public Object handleWrite(String key, Object value) {
        if (detector.isPartitioned()) {
            if ("CP".equals(policy)) {
                if (detector.isQuorumAvailable(2)) return quorumWrite(key, value);
                else throw new UnavailableException("No quorum during partition");
            } else { return localWrite(key, value); } // AP — queue for replication
        }
        return normalWrite(key, value);
    }
}
```

#### Edge Cases

| Edge Case | Handling |
|-----------|---------|
| Split-brain (both sides have quorum in even-node cluster) | Use odd number of nodes; or use witness node |
| Partition heals mid-transaction | Complete transaction on current path; reconcile after |
| Cascading partitions | Track partition graph; alert if >50% nodes unreachable |
| False positive partition detection | Use multiple detection methods (heartbeat + data + gossip) |
| Long-duration partition (hours) | Escalate to ops; consider manual reconciliation |

---

## F. Summary & Practice

### Key Takeaways

1. **CAP**: pick 2 of Consistency, Availability, Partition Tolerance
2. **P is mandatory** in distributed systems — real choice is CP vs AP
3. **CP**: blocks during partition to maintain consistency (banking, locks)
4. **AP**: serves during partition with possibly stale data (social media, caching)
5. **CA only exists** on a single node (no network = no partition)
6. **CAP is a spectrum**, not binary — most systems offer tunable consistency
7. **PACELC extends CAP**: also considers Latency vs Consistency during normal operation
8. **Different data in the same system can make different CAP choices**
9. Know the CAP classification of common databases (Cassandra=AP, MongoDB=CP, etc.)
10. **Test for partitions** using chaos engineering tools

### Revision Checklist

- [ ] Can I state the CAP theorem and explain all three properties?
- [ ] Can I explain why P is mandatory in distributed systems?
- [ ] Can I give examples of CP and AP systems?
- [ ] Can I explain what happens during a partition for CP vs AP?
- [ ] Do I know the CAP classification of 5+ databases?
- [ ] Can I explain PACELC?
- [ ] Can I make CAP choices for different components in a single system?
- [ ] Can I explain tunable consistency with Cassandra/DynamoDB examples?

### Interview Questions

1. What is the CAP theorem? Explain each property.
2. Why can't a distributed system provide all three guarantees?
3. Is your design CP or AP? Justify your choice.
4. What happens to a CP system during a network partition?
5. When would you choose AP over CP?
6. Can different parts of the same system make different CAP choices?
7. What is PACELC and how does it extend CAP?
8. Classify these databases: PostgreSQL, Cassandra, DynamoDB, MongoDB.
9. How would you test your system's behavior during a partition?
10. What is tunable consistency? Give an example.

### Practice Exercises

1. **Exercise 1**: For each scenario, decide CP or AP and justify: (a) bank account balance, (b) social media likes counter, (c) shopping cart, (d) distributed lock service, (e) DNS.

2. **Exercise 2**: Design an e-commerce platform where the payment service is CP and the product catalog is AP. Show the architecture and explain what happens during a partition.

3. **Exercise 3**: You're using Cassandra with consistency level QUORUM (N=3, R=2, W=2). A partition splits your cluster into [Node1, Node2] and [Node3]. Which operations succeed? Which fail?

4. **Exercise 4**: Explain the PACELC classification for: Cassandra, MongoDB, Spanner, and Redis. How does each behave during normal operation vs during a partition?

---

> **Previous**: [07 — Consistency](07-consistency.md)
> **Next**: [09 — ACID vs BASE](09-acid-vs-base.md)
