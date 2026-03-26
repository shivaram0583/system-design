# Topic 20: Rate Limiting

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–19

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

### What is Rate Limiting?

Rate limiting controls how many requests a client can make to a service within a given time window, protecting the system from abuse, DDoS attacks, and overload.

```
Without rate limiting:
  Malicious bot → 100,000 req/s → Server overloaded → All users affected

With rate limiting:
  Malicious bot → 100,000 req/s → Rate limiter blocks 99,900 → Server handles 100/s
  Normal users → unaffected
```

### Rate Limiting Algorithms

#### 1. Token Bucket

```
Bucket holds tokens. Each request costs 1 token. Tokens refill at a fixed rate.

  Bucket capacity: 10 tokens
  Refill rate: 2 tokens/sec

  [■■■■■■■■■■] 10 tokens (full)
  Request → takes 1 token → [■■■■■■■■■ ] 9 tokens → allowed
  ...
  [          ] 0 tokens → request DENIED (429 Too Many Requests)
  1 second later → [ ■■        ] 2 tokens refilled

Pros: Allows bursts (up to bucket capacity), smooth rate over time
Cons: Memory per user (bucket state)
Best for: API rate limiting (most common algorithm)
```

#### 2. Leaky Bucket

```
Requests enter a queue (bucket). Processed at a fixed rate. Overflow rejected.

  Queue capacity: 10
  Processing rate: 2 req/sec

  Incoming: 5 req → Queue: [■■■■■] → processes 2/s → smooth output
  Incoming: 15 req → Queue: [■■■■■■■■■■] full → 5 REJECTED

Pros: Perfectly smooth output rate
Cons: No burst tolerance; recent requests may be delayed
Best for: Traffic shaping, network rate limiting
```

#### 3. Fixed Window Counter

```
Count requests in fixed time windows. Reset counter at window boundary.

  Window: 1 minute, Limit: 100 requests
  
  12:00:00 - 12:01:00 → counter = 0...100 → all allowed
  12:01:00 → counter resets to 0
  
  Problem: Boundary spike
  12:00:50 → 100 requests (allowed)
  12:01:00 → counter resets
  12:01:10 → 100 requests (allowed)
  → 200 requests in 20 seconds! (2× the intended rate)

Pros: Simple, low memory
Cons: Boundary spike problem
Best for: Simple use cases where boundary spikes are acceptable
```

#### 4. Sliding Window Log

```
Track timestamp of every request. Count requests within the last window.

  Window: 1 minute, Limit: 100
  
  New request at 12:01:30:
    Count all requests with timestamp > 12:00:30
    If count < 100 → allow + log timestamp
    If count >= 100 → deny

Pros: No boundary spike problem, accurate
Cons: High memory (stores every timestamp)
Best for: Accurate limiting when memory is not a concern
```

#### 5. Sliding Window Counter

```
Combines fixed window + sliding window. Weighted count from current + previous window.

  Window: 1 minute, Limit: 100
  Previous window (12:00-12:01): 80 requests
  Current window (12:01-12:02): 30 requests so far
  Current time: 12:01:40 (67% through current window)
  
  Weighted count = prev × (1 - 0.67) + current = 80 × 0.33 + 30 = 56.4
  56.4 < 100 → Allow

Pros: Smooth, low memory, no boundary spike
Cons: Approximate (but very close to accurate)
Best for: Production API rate limiting (best balance)
```

### Algorithm Comparison

| Algorithm | Memory | Accuracy | Burst | Complexity |
|-----------|--------|----------|-------|-----------|
| Token Bucket | Low | Good | Allows burst | Low |
| Leaky Bucket | Low | Perfect | No burst | Low |
| Fixed Window | Very low | Boundary issues | Allows 2× at boundary | Very low |
| Sliding Window Log | High | Perfect | No burst | Medium |
| Sliding Window Counter | Low | Near-perfect | Limited burst | Medium |

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows rate limiting protects services; can mention 429 status |
| **Mid** | Knows token bucket algorithm; can implement basic rate limiter |
| **Senior** | Discusses distributed rate limiting, multiple algorithms, Redis-based |
| **Staff+** | Multi-tier rate limiting, rate limit headers, graceful degradation |

### Red Flags

- Not including rate limiting in API design
- Not knowing any rate limiting algorithms
- Ignoring distributed rate limiting challenges
- Not considering different limits for different users/endpoints

### Common Questions

1. What is rate limiting and why is it needed?
2. Explain the token bucket algorithm.
3. How would you implement distributed rate limiting?
4. What rate limits would you set for this API?
5. How do you handle rate-limited requests gracefully?

---

## C. Practical Engineering View

### Rate Limit Headers

```
Standard HTTP response headers:
  X-RateLimit-Limit: 100          # Max requests per window
  X-RateLimit-Remaining: 45       # Remaining requests
  X-RateLimit-Reset: 1699900060   # Unix timestamp when window resets
  Retry-After: 30                 # Seconds to wait (on 429 response)

Response on rate limit:
  HTTP/1.1 429 Too Many Requests
  Retry-After: 30
  Content-Type: application/json
  
  {
    "error": "rate_limit_exceeded",
    "message": "Too many requests. Retry after 30 seconds.",
    "retry_after": 30
  }
```

### Multi-Tier Rate Limiting

```
Apply different limits at different levels:

  Tier 1: Global (protect infrastructure)
    100K req/s total across all clients
    
  Tier 2: Per-IP (prevent DDoS)
    1000 req/s per IP
    
  Tier 3: Per-User (fair usage)
    Free tier: 100 req/min
    Pro tier: 1000 req/min
    Enterprise: 10000 req/min
    
  Tier 4: Per-Endpoint (protect expensive operations)
    GET /search: 30 req/min
    POST /upload: 10 req/min
    POST /login: 5 req/min (brute force protection)
```

### Distributed Rate Limiting with Redis

```
Challenge: Multiple API servers need shared rate limit state.

  ┌──────┐  ┌──────┐  ┌──────┐
  │ API1 │  │ API2 │  │ API3 │  All check the SAME counter
  └──┬───┘  └──┬───┘  └──┬───┘
     └─────────┼────────┘
          ┌────┴────┐
          │  Redis  │  Atomic increment: INCR user:123:minute:1700000
          └─────────┘  TTL auto-expires old keys

Redis Lua script for atomic token bucket:
  local tokens = redis.call('get', KEYS[1])
  if tokens == false then tokens = ARGV[1] end  -- bucket capacity
  if tonumber(tokens) > 0 then
    redis.call('decr', KEYS[1])
    return 1  -- allowed
  else
    return 0  -- denied
  end
```

---

## D. Example: API Rate Limiting for SaaS Platform

```
Plan-based limits:
  Free:       100 req/min, 1000 req/day
  Starter:    500 req/min, 10K req/day
  Pro:        2000 req/min, 100K req/day
  Enterprise: Custom, 1M+ req/day

Architecture:
  ┌────────┐     ┌──────────────┐     ┌──────────┐
  │ Client │────►│ API Gateway  │────►│ Backend  │
  └────────┘     │ (Rate Limit) │     │ Services │
                 └──────┬───────┘     └──────────┘
                        │
                   ┌────┴────┐
                   │  Redis  │  Rate limit counters
                   └─────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Rate Limiting Service

```
┌──────────────────────────────────────────────────┐
│  Clients                                          │
│      │                                            │
│  ┌───┴──────────────┐                             │
│  │  API Gateway     │                             │
│  │  (Nginx/Kong)    │─── check ──► Rate Limit    │
│  │                  │◄── allow/deny ── Service    │
│  └───┬──────────────┘              │              │
│      │                        ┌────┴────┐         │
│  ┌───┴────────┐               │  Redis  │         │
│  │  Backend   │               │ Cluster │         │
│  │  Services  │               └─────────┘         │
│  └────────────┘                                   │
│                                                    │
│  Config DB: rate limit rules per plan/endpoint    │
│  Dashboard: real-time rate limit metrics           │
└──────────────────────────────────────────────────┘
```

### E.2 LLD — Token Bucket Rate Limiter

```java
public class TokenBucketRateLimiter {
    private final int capacity;
    private double tokens;
    private final double refillRate; // tokens per second
    private long lastRefill;
    private final Object lock = new Object();

    public TokenBucketRateLimiter(int capacity, double refillRate) {
        this.capacity = capacity; this.tokens = capacity;
        this.refillRate = refillRate; this.lastRefill = System.nanoTime();
    }

    public boolean allow() {
        synchronized (lock) {
            refill();
            if (tokens >= 1) { tokens--; return true; }
            return false;
        }
    }

    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefill) / 1_000_000_000.0;
        tokens = Math.min(capacity, tokens + elapsed * refillRate);
        lastRefill = now;
    }
}

/** Redis-based sliding window counter */
public class DistributedRateLimiter {
    private final RedisClient redis;
    private final int defaultLimit;
    private final int windowSec;

    public DistributedRateLimiter(RedisClient redis, int defaultLimit, int windowSec) {
        this.redis = redis; this.defaultLimit = defaultLimit; this.windowSec = windowSec;
    }

    public RateLimitResult allow(String clientId, Integer limit) {
        int effectiveLimit = (limit != null) ? limit : defaultLimit;
        long now = System.currentTimeMillis() / 1000;
        long windowStart = (now / windowSec) * windowSec;
        String key = "rl:" + clientId + ":" + windowStart;

        // Atomic increment + expire via pipeline
        long currentCount = redis.incr(key);
        redis.expire(key, windowSec + 1);

        boolean allowed = currentCount <= effectiveLimit;
        int remaining = Math.max(0, effectiveLimit - (int) currentCount);
        long resetAt = windowStart + windowSec;

        return new RateLimitResult(allowed, effectiveLimit, remaining, resetAt);
    }
}
```

---

## F. Summary & Practice

### Key Takeaways

1. **Rate limiting** protects services from abuse, DDoS, and overload
2. **Token bucket** is the most widely used algorithm (allows bursts)
3. **Sliding window counter** offers best accuracy-to-memory ratio
4. Use **Redis** for distributed rate limiting across multiple API servers
5. Apply **multi-tier limits**: global, per-IP, per-user, per-endpoint
6. Return proper **rate limit headers** (X-RateLimit-Limit, Remaining, Reset)
7. Return **429 Too Many Requests** with **Retry-After** header
8. Different plans/tiers should have different rate limits

### Interview Questions

1. What is rate limiting and why is it important?
2. Explain the token bucket algorithm.
3. Compare fixed window vs sliding window rate limiting.
4. How would you implement distributed rate limiting?
5. What rate limits would you set for a public API?
6. How do you handle legitimate users who hit rate limits?
7. Design rate limiting for a multi-tenant SaaS platform.

### Practice Exercises

1. **Exercise 1**: Implement a sliding window counter rate limiter using Redis. Handle the edge case where Redis is temporarily unavailable.
2. **Exercise 2**: Design rate limiting for a public API with free, pro, and enterprise tiers. Include per-endpoint limits for expensive operations.
3. **Exercise 3**: Your rate limiter uses a fixed window. A client consistently sends bursts at window boundaries. Redesign to prevent this.

---

> **Previous**: [19 — Pub-Sub](19-pub-sub.md)
> **Next**: [21 — Idempotency](21-idempotency.md)
