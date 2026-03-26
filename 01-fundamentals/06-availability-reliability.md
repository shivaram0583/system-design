# Topic 6: Availability & Reliability

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Beginner → Intermediate
> **Prerequisites**: Topics 1–5

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

### Definitions

**Availability** = the percentage of time a system is operational and accessible.

**Reliability** = the probability that a system performs its intended function correctly over a given period.

```
Availability answers:  "Is the system UP right now?"
Reliability answers:   "Does the system give CORRECT results over time?"

A system can be:
  ✓ Available but unreliable (up but returns wrong data)
  ✓ Reliable but unavailable (correct when up, but frequently down)
  ✓ Both (ideal)
  ✗ Neither (disaster)
```

### Measuring Availability — The Nines

| Nines | Availability | Downtime/Year | Downtime/Month | Downtime/Day |
|-------|-------------|---------------|----------------|-------------|
| 1 nine | 90% | 36.5 days | 3 days | 2.4 hours |
| 2 nines | 99% | 3.65 days | 7.3 hours | 14.4 min |
| 3 nines | 99.9% | 8.76 hours | 43.8 min | 1.44 min |
| 4 nines | 99.99% | 52.6 min | 4.38 min | 8.6 sec |
| 5 nines | 99.999% | 5.26 min | 26.3 sec | 0.86 sec |

```
Formula: Availability = Uptime / (Uptime + Downtime) × 100%

Example: System was up 8,750 hours in a year (total 8,760 hours)
  Availability = 8750/8760 × 100% = 99.886% ≈ 2.9 nines
  Downtime = 10 hours/year
```

### Availability in Series vs Parallel

```
SERIES (both must work):
  ┌──────┐    ┌──────┐
  │  A   │───►│  B   │    A(total) = A(a) × A(b)
  │ 99.9%│    │ 99.9%│    = 0.999 × 0.999 = 99.8%
  └──────┘    └──────┘    
  Availability DECREASES with more components in series

PARALLEL (either can work):
  ┌──────┐
  │  A   │
  │ 99.9%│    A(total) = 1 - (1-A(a)) × (1-A(b))
  └──────┘    = 1 - 0.001 × 0.001 = 99.9999%
  ┌──────┐
  │  B   │
  │ 99.9%│
  └──────┘
  Availability INCREASES with redundancy
```

### Reliability Metrics

| Metric | Definition | Formula |
|--------|-----------|---------|
| **MTBF** | Mean Time Between Failures | Total uptime / Number of failures |
| **MTTR** | Mean Time To Repair | Total downtime / Number of failures |
| **MTTF** | Mean Time To Failure | Time until first failure (non-repairable) |
| **MTTD** | Mean Time To Detect | Time from failure to detection |

```
Availability = MTBF / (MTBF + MTTR)

Example:
  System fails once a month, takes 30 min to fix
  MTBF = 30 days = 43,200 min
  MTTR = 30 min
  Availability = 43,200 / (43,200 + 30) = 99.93% (≈ 3 nines)

To improve availability:
  Option 1: Increase MTBF (fail less often) → better hardware, testing
  Option 2: Decrease MTTR (fix faster) → automation, runbooks, redundancy
```

### Types of Failures

| Failure Type | Example | Mitigation |
|-------------|---------|-----------|
| **Hardware** | Disk failure, power supply | Redundancy, RAID, multi-AZ |
| **Software** | Bug, memory leak, crash | Testing, canary deploys, rollback |
| **Network** | Partition, packet loss, DNS | Redundant paths, CDN, retries |
| **Human** | Misconfiguration, bad deploy | Automation, code review, rollback |
| **Dependency** | External API down, cloud outage | Circuit breakers, fallbacks, multi-cloud |
| **Overload** | Traffic spike, DDoS | Auto-scaling, rate limiting, queue |
| **Data** | Corruption, accidental deletion | Backups, replication, point-in-time recovery |

### Redundancy Patterns

```
ACTIVE-PASSIVE (Failover):
  ┌──────────┐     ┌──────────┐
  │  Primary  │     │ Standby  │
  │ (Active)  │────►│(Passive) │  Standby takes over on failure
  │ Serves    │ sync│ Idle,    │  Downtime = detection + failover time
  │ traffic   │     │ ready    │  (typically 30s - 5min)
  └──────────┘     └──────────┘

ACTIVE-ACTIVE:
  ┌──────────┐     ┌──────────┐
  │ Server 1 │     │ Server 2 │
  │ (Active)  │◄──►│ (Active)  │  Both serve traffic
  │ 50% load  │sync│ 50% load  │  If one fails, other handles 100%
  └──────────┘     └──────────┘  No failover delay
  
  ┌───────────────┐
  │ Load Balancer │  Routes to both; detects failures
  └───────────────┘

N+1 REDUNDANCY:
  Need N servers to handle load. Deploy N+1.
  ┌────┐ ┌────┐ ┌────┐ ┌────┐
  │ S1 │ │ S2 │ │ S3 │ │ S4 │  ← Need 3 to handle load
  └────┘ └────┘ └────┘ └────┘    S4 is the +1 spare
  If any one fails, remaining 3 still handle full load.
```

### Fault Tolerance vs High Availability

| Aspect | High Availability | Fault Tolerance |
|--------|------------------|-----------------|
| **Goal** | Minimize downtime | Zero downtime |
| **Approach** | Quick failover | Redundant operation |
| **Downtime on failure** | Seconds to minutes | None (seamless) |
| **Cost** | Moderate | High (2× or more hardware) |
| **Example** | Active-passive DB | Active-active with instant failover |
| **Use case** | Most web applications | Financial systems, aviation, healthcare |

### Graceful Degradation

When parts fail, the system should degrade gracefully rather than crash entirely:

```
FULL SYSTEM:
  Product page shows: image + price + reviews + recommendations + inventory

PARTIAL FAILURE (recommendation service down):
  Product page shows: image + price + reviews + [placeholder] + inventory
  → Still usable! User can still buy.

SEVERE FAILURE (database read replica down):
  Product page shows: cached version (may be stale)
  → Still shows something! Better than an error page.

CRITICAL FAILURE (primary DB down):
  Redirect to static page: "We're experiencing issues, please try later"
  → Still communicates! Better than connection timeout.

Strategy: Define TIERS of functionality
  Tier 1 (critical): Must work — core purchase flow
  Tier 2 (important): Should work — search, browse
  Tier 3 (nice-to-have): Can fail — recommendations, reviews
```

### Chaos Engineering

Deliberately inject failures to test resilience:

```
Chaos Engineering Principles:
  1. Define "steady state" (normal behavior metrics)
  2. Hypothesize that steady state continues during failure
  3. Introduce real-world failure events
  4. Try to disprove the hypothesis
  5. Fix any weaknesses found

Netflix Chaos Monkey:
  - Randomly kills production instances
  - Forces teams to build resilient services
  - Runs during business hours (when engineers are awake)

Types of chaos experiments:
  • Kill a random server instance
  • Introduce network latency (100-500ms)
  • Simulate AZ/region failure
  • Fill disk to 100%
  • Inject CPU saturation
  • Kill a dependency (return 500 errors)
  • Corrupt network packets
```

---

## B. Interview View

### How This Topic Appears

Every system design interview has a non-functional requirement around availability:
- "Design this for 99.9% availability"
- "What happens when this component fails?"
- "How do you ensure the system stays up during deploys?"

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows what availability means; can say "use redundancy" |
| **Mid** | Calculates nines; knows failover patterns; mentions health checks |
| **Senior** | Designs for graceful degradation; discusses MTTR vs MTBF; chaos engineering |
| **Staff+** | Multi-region failover; SLO budgets; organizational incident response |

### Red Flags

- Not mentioning redundancy or failover
- Claiming 99.999% availability without explaining the cost/complexity
- Single points of failure in the design
- No plan for what happens when a component fails
- Confusing availability with reliability

### Common Follow-up Questions

1. "What's the availability of your overall design if each component is 99.9%?"
2. "What happens when the database primary fails?"
3. "How do you achieve zero-downtime deployments?"
4. "What's the difference between active-passive and active-active?"
5. "How would you reduce MTTR for this system?"
6. "What is graceful degradation? Give an example."
7. "How would you test your system's resilience?"
8. "What SLA would you offer for this system?"

---

## C. Practical Engineering View

### SLA/SLO/SLI for Availability

```
SLI: Percentage of successful requests (HTTP 2xx/3xx out of total)
SLO: 99.9% of requests succeed over a 30-day window (internal target)
SLA: 99.5% uptime guaranteed to customers (contractual)

Error Budget:
  SLO = 99.9% → Error budget = 0.1% = 43.8 min/month
  
  If you've used 30 min of downtime this month:
    Remaining budget = 13.8 min
    → Slow down risky deployments
    → Focus on reliability improvements
  
  If you've used 0 min:
    Full budget available
    → Safe to deploy new features
    → Can take calculated risks
```

### Health Checks

```
Types of health checks:

1. SHALLOW (Liveness):
   GET /health → 200 OK
   Checks: "Is the process running?"
   Use: Load balancer removes dead instances

2. DEEP (Readiness):
   GET /health/ready → 200 OK
   Checks: DB connection, Redis connection, disk space, dependencies
   Use: Don't send traffic until fully ready

3. STARTUP:
   GET /health/startup → 200 OK
   Checks: Has the app finished initializing?
   Use: K8s won't kill slow-starting containers

Health check response:
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up", "latency_ms": 2 },
    "redis": { "status": "up", "latency_ms": 1 },
    "disk": { "status": "ok", "free_gb": 45 },
    "memory": { "status": "ok", "usage_pct": 62 }
  },
  "version": "2.3.1",
  "uptime_seconds": 86400
}
```

### Zero-Downtime Deployment Strategies

| Strategy | How | Downtime | Risk | Rollback Speed |
|----------|-----|----------|------|---------------|
| **Rolling** | Replace instances one by one | Zero | Old+new run simultaneously | Medium |
| **Blue-Green** | Two identical envs; switch traffic | Zero | Full rollback available | Instant |
| **Canary** | Route 1-5% to new version, then ramp | Zero | Limited blast radius | Instant |
| **Feature Flags** | Deploy code but toggle feature | Zero | Feature-level control | Instant |

```
BLUE-GREEN:
  ┌──────────────────────┐    ┌──────────────────────┐
  │  BLUE (v1 - current) │    │ GREEN (v2 - new)     │
  │  ┌────┐ ┌────┐       │    │ ┌────┐ ┌────┐        │
  │  │ S1 │ │ S2 │       │    │ │ S1 │ │ S2 │        │
  │  └────┘ └────┘       │    │ └────┘ └────┘        │
  └──────────────────────┘    └──────────────────────┘
         ▲                           
    ┌────┴─────┐ ──── switch ────►  After validation,
    │    LB    │                    LB points to GREEN
    └──────────┘                    BLUE becomes standby

CANARY:
  Traffic: 95% → v1 (stable)
            5% → v2 (canary)
  Monitor canary for errors, latency
  If OK: ramp 5% → 25% → 50% → 100%
  If bad: rollback canary, 100% → v1
```

### Incident Response

```
Incident Severity Levels:
  SEV1: Complete outage, all users affected     → All hands, 15 min response
  SEV2: Major feature down, many users affected → On-call + backup, 30 min
  SEV3: Minor feature degraded, some users      → On-call, 1 hour
  SEV4: Cosmetic issue, no user impact          → Next business day

Incident Lifecycle:
  1. DETECT  → Monitoring alerts fire (automated)
  2. TRIAGE  → Assess severity, assign incident commander
  3. MITIGATE → Stop the bleeding (rollback, failover, scale)
  4. RESOLVE → Fix the root cause
  5. POSTMORTEM → Blameless review, action items
```

### Multi-AZ and Multi-Region

```
SINGLE AZ (no redundancy):
  Availability ≈ 99.9% (AZ SLA)
  Risk: AZ failure = total outage

MULTI-AZ (standard production):
  ┌─────────────┐  ┌─────────────┐
  │    AZ-1     │  │    AZ-2     │
  │ ┌───┐ ┌───┐ │  │ ┌───┐ ┌───┐ │
  │ │App│ │App│ │  │ │App│ │App│ │
  │ └───┘ └───┘ │  │ └───┘ └───┘ │
  │ ┌─────────┐ │  │ ┌─────────┐ │
  │ │DB Primary│ │  │ │DB Replica│ │
  │ └─────────┘ │  │ └─────────┘ │
  └─────────────┘  └─────────────┘
  Availability ≈ 99.99%
  
MULTI-REGION (highest availability):
  ┌──────────────┐  ┌──────────────┐
  │  US-EAST     │  │  EU-WEST     │
  │  (Primary)   │  │  (Secondary) │
  │  Full stack  │◄►│  Full stack  │
  └──────────────┘  └──────────────┘
  Availability ≈ 99.999%
  Cost: 2-3× single region
  Complexity: Data replication, conflict resolution
```

---

## D. Example: Payment Service — Designing for 99.99% Availability

### Requirements

- Process payments for an e-commerce platform
- 10K transactions/day, p99 < 500ms
- 99.99% availability (< 52 min downtime/year)
- No duplicate charges, no lost transactions

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT SERVICE                            │
│                                                               │
│  ┌─────────┐   ┌──────────┐   ┌───────────────────────┐     │
│  │   LB    │──►│ App (×3) │──►│  PostgreSQL            │     │
│  │(Active- │   │ Stateless│   │  Primary + 2 Replicas  │     │
│  │ Active) │   │ across   │   │  Multi-AZ              │     │
│  └─────────┘   │ 2 AZs   │   └───────────────────────┘     │
│                └──────────┘                                   │
│                     │                                         │
│                ┌────┴─────┐   ┌──────────────┐               │
│                │  Redis   │   │ Dead Letter   │               │
│                │ (Cache + │   │ Queue (DLQ)   │               │
│                │  Idempot)│   │ Failed txns   │               │
│                └──────────┘   └──────────────┘               │
│                     │                                         │
│                ┌────┴─────┐                                   │
│                │  Kafka   │  Audit log + downstream events    │
│                └──────────┘                                   │
└─────────────────────────────────────────────────────────────┘

Availability Calculation:
  LB: 99.99% (managed, multi-AZ)
  App (3 instances): 1-(1-0.999)³ = 99.9999%
  DB (primary + auto-failover): 99.99%
  Redis (cluster): 99.99%
  
  Series: 0.9999 × 0.999999 × 0.9999 × 0.9999 = 99.97%
  → Need to optimize further: add caching, circuit breakers
```

### Failure Scenarios and Responses

| Failure | Detection | Response | User Impact |
|---------|-----------|----------|-------------|
| 1 app server dies | Health check (10s) | LB removes; traffic to others | None (< 10s) |
| DB primary fails | Heartbeat (30s) | Auto-failover to replica | 30s of failed writes |
| Redis down | Health check | Bypass cache; read from DB | Slightly slower |
| Payment gateway down | Timeout (5s) | Circuit breaker opens; queue retry | "Processing" status |
| Entire AZ fails | Multi-AZ monitoring | Traffic shifts to other AZ | < 60s |
| Bad deployment | Canary metrics | Auto-rollback | < 5% users for < 2 min |

---

## E. HLD and LLD

### E.1 HLD — Highly Available Notification System

#### Requirements

- Send push, email, SMS notifications
- 50M notifications/day
- 99.9% delivery rate
- At-least-once delivery guarantee
- Survive single AZ failure

#### Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                                                                 │
│  Producers (any service)                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │Order Svc │ │Auth Svc  │ │Marketing │                       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                       │
│       └─────────────┼───────────┘                              │
│                     ▼                                          │
│  ┌──────────────────────────────┐                              │
│  │    Kafka (Multi-AZ, 3       │                              │
│  │    brokers, replication=3)  │  Durability: messages survive │
│  │    Topic: notifications     │  broker failure               │
│  └──────────────┬──────────────┘                              │
│                 │                                              │
│    ┌────────────┼────────────┐                                 │
│    ▼            ▼            ▼                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐                                 │
│  │Push  │  │Email │  │SMS   │   Consumer groups (independent) │
│  │Worker│  │Worker│  │Worker│   Each scales independently     │
│  │(×3)  │  │(×3)  │  │(×2)  │                                 │
│  └──┬───┘  └──┬───┘  └──┬───┘                                 │
│     │         │         │                                      │
│     ▼         ▼         ▼                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐                                 │
│  │ FCM/ │  │ SES/ │  │Twilio│   External providers            │
│  │ APNS │  │ SMTP │  │      │   (with fallback providers)     │
│  └──────┘  └──────┘  └──────┘                                 │
│                                                                 │
│  ┌──────────────────────────┐                                  │
│  │  Notification DB (Postgres)│  Track delivery status          │
│  │  + Redis (dedup/rate limit)│  Idempotency check              │
│  └──────────────────────────┘                                  │
│                                                                 │
│  ┌──────────────────────────┐                                  │
│  │  Dead Letter Queue       │  Failed after N retries          │
│  │  + Alert on DLQ depth    │  Manual investigation            │
│  └──────────────────────────┘                                  │
└───────────────────────────────────────────────────────────────┘
```

#### Availability Strategy

| Component | Availability Mechanism |
|-----------|----------------------|
| **Kafka** | 3 brokers, replication factor 3, multi-AZ |
| **Workers** | Multiple instances per type, auto-restart on crash |
| **External providers** | Primary + fallback (SES → SendGrid, Twilio → Vonage) |
| **Database** | Multi-AZ RDS with auto-failover |
| **Redis** | Cluster mode, multi-AZ |

#### Trade-offs

| Decision | Chosen | Why |
|----------|--------|-----|
| At-least-once vs exactly-once | At-least-once + idempotency | Simpler; idempotency key prevents duplicates |
| Kafka vs SQS | Kafka | Replay capability, ordering, higher throughput |
| Single provider vs multi | Multi with fallback | If SES is down, switch to SendGrid |
| Sync vs async delivery | Async (queue-based) | Producers don't wait; handles spikes |

---

### E.2 LLD — Health Check and Failover Module

#### Classes

```
┌──────────────────────────────┐
│       HealthChecker          │
│                              │
│  - checks: List<HealthCheck> │
│  - interval: Duration        │
│  - timeout: Duration         │
│                              │
│  + runAll(): HealthReport    │
│  + register(check): void     │
│  + isHealthy(): boolean      │
└──────────────┬───────────────┘
               │
      ┌────────┼─────────┐
      │        │         │
┌─────┴──┐ ┌──┴────┐ ┌──┴──────┐
│  DB    │ │ Redis │ │ Custom  │
│ Check  │ │ Check │ │ Check   │
└────────┘ └───────┘ └─────────┘

┌──────────────────────────────┐
│    FailoverManager           │
│                              │
│  - primary: Endpoint         │
│  - secondary: Endpoint       │
│  - healthChecker: HealthChkr │
│  - state: PRIMARY|SECONDARY  │
│                              │
│  + getCurrentEndpoint()      │
│  + checkAndFailover(): void  │
│  + failback(): void          │
└──────────────────────────────┘
```

#### Pseudocode

```java
public class HealthChecker {
    private final List<HealthCheck> checks = new ArrayList<>();
    private final int intervalSec;
    private final int timeoutSec;
    private Map<String, Object> lastReport;

    public HealthChecker(int intervalSec, int timeoutSec) {
        this.intervalSec = intervalSec; this.timeoutSec = timeoutSec;
    }

    public void register(String name, Runnable checkFn) {
        checks.add(new HealthCheck(name, checkFn));
    }

    public Map<String, Object> runAll() {
        Map<String, Object> results = new LinkedHashMap<>();
        boolean overallHealthy = true;
        for (HealthCheck check : checks) {
            try {
                long start = System.nanoTime();
                check.fn().run(); // Throws on failure
                double latencyMs = (System.nanoTime() - start) / 1_000_000.0;
                results.put(check.name(), Map.of("status", "up", "latency_ms", latencyMs));
            } catch (Exception e) {
                results.put(check.name(), Map.of("status", "down", "error", e.getMessage()));
                overallHealthy = false;
            }
        }
        lastReport = Map.of("healthy", overallHealthy, "checks", results,
                            "timestamp", System.currentTimeMillis());
        return lastReport;
    }
}

public class FailoverManager {
    private final String primary;
    private final String secondary;
    private final HealthChecker checker;
    private String state = "PRIMARY";
    private int consecutiveFailures = 0;
    private int consecutiveSuccesses = 0;
    private final int failureThreshold;
    private final int recoveryThreshold;

    public FailoverManager(String primary, String secondary, HealthChecker checker,
                           int failureThreshold, int recoveryThreshold) {
        this.primary = primary; this.secondary = secondary;
        this.checker = checker;
        this.failureThreshold = failureThreshold;
        this.recoveryThreshold = recoveryThreshold;
    }

    public String getCurrentEndpoint() {
        return "PRIMARY".equals(state) ? primary : secondary;
    }

    /** Called periodically by scheduler */
    public void checkAndFailover() {
        Map<String, Object> report = checker.runAll();
        if ("PRIMARY".equals(state)) {
            if (!(boolean) report.get("healthy")) {
                consecutiveFailures++; consecutiveSuccesses = 0;
                if (consecutiveFailures >= failureThreshold) failoverToSecondary();
            } else { consecutiveFailures = 0; }
        } else {
            boolean primaryHealthy = checkPrimaryDirectly();
            if (primaryHealthy) {
                consecutiveSuccesses++;
                if (consecutiveSuccesses >= recoveryThreshold) failbackToPrimary();
            } else { consecutiveSuccesses = 0; }
        }
    }

    private void failoverToSecondary() {
        state = "SECONDARY"; consecutiveFailures = 0;
        log.warn("FAILOVER: switched to secondary (" + secondary + ")");
    }

    private void failbackToPrimary() {
        state = "PRIMARY"; consecutiveSuccesses = 0;
        log.info("FAILBACK: returned to primary (" + primary + ")");
    }
}
```

#### Edge Cases

| Edge Case | Handling |
|-----------|---------|
| Health check itself times out | Treat as failure; use shorter timeout than check interval |
| Flapping between primary/secondary | Asymmetric thresholds: 3 failures to failover, 5 successes to failback |
| Both primary and secondary down | Alert SEV1; serve cached/static fallback; activate disaster recovery |
| Network partition (app can't reach DB but DB is fine) | Use multiple check paths; don't failover on single-path failure |
| Failover during active transactions | Drain connections gracefully; retry in-flight requests |
| Split-brain (both think they're primary) | Use distributed lock (ZooKeeper/etcd) for leader election |

---

## F. Summary & Practice

### Key Takeaways

1. **Availability** = % uptime; **Reliability** = correctness over time
2. **Nines matter**: 99.9% = 8.76h downtime/year; 99.99% = 52 min/year
3. **Series reduces** availability; **parallel (redundancy) increases** it
4. **MTTR often matters more than MTBF** — fix fast > fail rarely
5. **Redundancy patterns**: active-passive, active-active, N+1
6. **Graceful degradation** > total failure — serve partial functionality
7. **Zero-downtime deploys**: rolling, blue-green, canary, feature flags
8. **Multi-AZ** is standard for production; **multi-region** for critical systems
9. **Chaos engineering**: test failures in production before they surprise you
10. **Error budgets**: balance reliability work vs feature velocity

### Revision Checklist

- [ ] Can I calculate availability from uptime/downtime?
- [ ] Can I calculate series and parallel availability?
- [ ] Do I know MTBF, MTTR, and their relationship to availability?
- [ ] Can I explain active-passive vs active-active redundancy?
- [ ] Can I design graceful degradation for a web app?
- [ ] Do I know 4 zero-downtime deployment strategies?
- [ ] Can I explain the difference between multi-AZ and multi-region?
- [ ] Can I define SLA, SLO, SLI, and error budgets?
- [ ] Can I list health check types (liveness, readiness, startup)?
- [ ] Can I describe chaos engineering and why it matters?

### Interview Questions

1. What's the difference between availability and reliability?
2. Calculate the availability of a system with 3 components at 99.9% each in series.
3. How do you achieve 99.99% availability?
4. What is graceful degradation? Give an example.
5. Compare active-passive vs active-active failover.
6. What are error budgets and how do you use them?
7. How do you deploy without downtime?
8. What is chaos engineering? Give an example experiment.
9. How would you design a payment system for high availability?
10. What happens to availability when you add more microservices?

### Practice Exercises

1. **Exercise 1**: Your system has: LB (99.99%), 3 app servers (99.9% each, parallel), DB primary (99.95%) + replica (99.95%, parallel), Redis (99.9%). Calculate overall availability.

2. **Exercise 2**: Design a graceful degradation plan for an e-commerce checkout flow. Define 4 tiers of functionality and what happens when each tier's dependency fails.

3. **Exercise 3**: Your MTTR is 45 minutes and you have 3 incidents per month. What's your availability? How would you improve it to 99.99%?

4. **Exercise 4**: Design a health check system for a microservices architecture with 10 services. Include liveness, readiness, and dependency checks. What do you do when a circular dependency is detected in health checks?

5. **Exercise 5**: Plan a chaos engineering experiment for a payment processing system. List 5 failure scenarios, expected behavior, and what you'd monitor.

---

> **Previous**: [05 — Scalability](05-scalability.md)
> **Next**: [07 — Consistency](07-consistency.md)
