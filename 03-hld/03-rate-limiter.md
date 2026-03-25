# HLD 03: Rate Limiter

> **Difficulty**: Easy-Medium
> **Key Concepts**: Sliding window, token bucket, distributed counting, Redis

---

## 1. Requirements

### Functional Requirements

- Limit requests per client (by IP, user ID, or API key)
- Support multiple rate limit rules (e.g., 100/min per user, 1000/hr per IP)
- Return 429 Too Many Requests when limit exceeded
- Return rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset)

### Non-Functional Requirements

- **Low latency**: < 1ms overhead per request
- **Accurate**: No significant over-counting or under-counting
- **Distributed**: Works across multiple API servers
- **Fault-tolerant**: If rate limiter is down, allow traffic (fail-open)

---

## 2. Capacity Estimation

```
Traffic: 10K requests/sec across all API servers
Rate limit checks: 10K/sec → Redis can handle 100K+ ops/sec easily

Storage (Redis):
  1M active users × 100 bytes per counter = 100 MB
  Easily fits in a single Redis instance

Network: 10K × 2 ops/sec (read + increment) = 20K Redis ops/sec
```

---

## 3. Algorithms

### Token Bucket

```
Each user has a bucket with N tokens.
Each request consumes 1 token.
Tokens refill at rate R per second.
If bucket is empty → reject (429).

  Bucket: capacity=10, refill_rate=1/sec
  
  T0: [■■■■■■■■■■] 10 tokens → request OK (9 left)
  T1: [■■■■■■■■■□] 9+1=10    → request OK (9 left)
  ...burst of 10 requests...
  Tx: [□□□□□□□□□□] 0 tokens  → REJECT 429
  Tx+1: [■□□□□□□□□□] 1 token  → request OK (0 left)

Pros: Allows bursts up to bucket capacity, smooth rate limiting
Cons: Two parameters to tune (capacity + refill rate)
```

### Sliding Window Log

```
Store timestamp of each request in a sorted set.
Count requests in the window [now - window_size, now].

  Window: 60 seconds, limit: 100 requests
  
  ZADD rate:{user_id} {timestamp} {request_id}
  ZREMRANGEBYSCORE rate:{user_id} 0 {now - 60}
  count = ZCARD rate:{user_id}
  if count >= 100: REJECT

Pros: Most accurate
Cons: High memory (stores every request timestamp)
```

### Sliding Window Counter (Recommended)

```
Combine fixed window counts with weighted average.

  Current window: 70% elapsed, count = 30
  Previous window: count = 80

  Estimated rate = 80 × 0.30 + 30 = 54 requests
  Limit: 100 → ALLOW (54 < 100)

  Redis: Two counters per user per window
  Memory efficient, reasonably accurate

  INCR rate:{user_id}:{current_window}
  GET rate:{user_id}:{previous_window}
  weighted = prev_count × overlap_pct + current_count
```

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                                                            │
│  ┌────────┐         ┌───────────────┐                    │
│  │ Client │────────►│  API Gateway  │                    │
│  └────────┘         │  / LB         │                    │
│       ▲              └───────┬───────┘                    │
│       │ 429                  │                             │
│       │                ┌─────┴──────┐                     │
│       │                │ Rate Limit │                     │
│       │                │ Middleware │                     │
│       │                └─────┬──────┘                     │
│       │                      │ check + increment          │
│       │                ┌─────┴──────┐                     │
│       │                │   Redis    │                     │
│       │                │  Cluster   │                     │
│       │                └────────────┘                     │
│       │                      │ ALLOW                      │
│       │                ┌─────┴──────┐                     │
│       │                │ API Server │                     │
│       └────────────────│ (backend)  │                     │
│                        └────────────┘                     │
│                                                            │
│  Rate Limit Rules (config):                               │
│  • Free tier:  100 req/min per API key                   │
│  • Pro tier:   1000 req/min per API key                  │
│  • Global:     10K req/sec total (circuit breaker)       │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Key Design Decisions

### Where to Rate Limit

```
Option A: API Gateway (recommended for most cases)
  All traffic passes through → single enforcement point
  Kong, Nginx, AWS API Gateway have built-in rate limiting

Option B: Application middleware
  More flexibility, custom rules per endpoint
  Must be consistent across all server instances (use Redis)

Option C: Per-service rate limiting
  Each microservice protects itself
  Defense in depth — combine with gateway

Recommended: Gateway (global) + per-service (protection)
```

### Race Conditions

```
Problem: Two requests arrive simultaneously, both read count=99 (limit=100), both increment.
  Result: 101 requests allowed (over the limit).

Solution: Atomic Redis operations
  -- Lua script (atomic in Redis)
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  if count > tonumber(ARGV[2]) then
      return 0  -- REJECT
  end
  return 1  -- ALLOW

  Lua scripts execute atomically in Redis → no race conditions.
```

---

## 6. Scaling & Bottlenecks

```
Redis scaling:
  Single Redis: handles 100K+ ops/sec (sufficient for most)
  Redis Cluster: for extreme scale, shard by user_id hash

Failure handling:
  If Redis is down → FAIL OPEN (allow all traffic)
  Better to serve with no rate limiting than to block all users
  Alert on Redis failure for manual intervention

Multi-region:
  Option A: Local Redis per region (allows region_limit per region)
  Option B: Global Redis (accurate global count, higher latency)
  Hybrid: Local rate limit + global aggregate (async sync)
```

---

## 7. Trade-offs

| Decision | Trade-off |
|----------|-----------|
| Token bucket vs sliding window | Burst tolerance vs accuracy |
| Fail-open vs fail-closed | Availability vs protection |
| Local vs global counters | Latency vs accuracy in multi-region |
| Gateway vs app-level | Simplicity vs flexibility |

---

## 8. Summary

- **Core**: Check request count against limit, reject if exceeded
- **Algorithm**: Sliding window counter (balanced accuracy + efficiency)
- **Storage**: Redis with atomic Lua scripts (no race conditions)
- **Where**: API Gateway + per-service middleware
- **Failure**: Fail-open (allow traffic if Redis is down)
- **Headers**: Return X-RateLimit-Limit, Remaining, Reset

> **Next**: [04 — Notification System](04-notification-system.md)
