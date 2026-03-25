# Topic 23: Retry, Timeout, Backoff

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–22 (especially Circuit Breaker)

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

### Timeout

A **timeout** sets the maximum time a client waits for a response before giving up.

```
WITHOUT timeout:
  Service A ──── request ────► Service B (stuck forever)
  Thread hangs indefinitely → thread pool exhaustion → A crashes

WITH timeout:
  Service A ──── request (timeout: 3s) ────► Service B
  After 3s with no response → timeout error → A can respond/retry

Types:
  Connection timeout: Max time to establish TCP connection (1-5s)
  Read/Response timeout: Max time to receive response (3-30s)
  Overall timeout: Total time for the entire operation (5-60s)
```

### Retry

**Retries** automatically re-attempt a failed operation, handling transient failures.

```
Transient failures (worth retrying):
  • Network timeout (server was briefly unreachable)
  • 500 Internal Server Error (server had a temporary glitch)
  • 503 Service Unavailable (server overloaded momentarily)
  • Connection refused (server restarting)

Permanent failures (DON'T retry):
  • 400 Bad Request (client error, won't fix itself)
  • 401 Unauthorized (wrong credentials)
  • 404 Not Found (resource doesn't exist)
  • 409 Conflict (business logic violation)
```

### Backoff Strategies

| Strategy | Delay Pattern | Example (base=1s) | Use Case |
|----------|-------------|-------------------|----------|
| **No backoff** | Fixed: same delay | 1s, 1s, 1s, 1s | Simple cases |
| **Fixed backoff** | Constant delay | 2s, 2s, 2s, 2s | Predictable recovery |
| **Linear backoff** | delay × attempt | 1s, 2s, 3s, 4s | Gradual increase |
| **Exponential backoff** | delay × 2^attempt | 1s, 2s, 4s, 8s | Standard for APIs |
| **Exponential + jitter** | random(0, delay × 2^attempt) | 0.7s, 1.3s, 3.8s, 6.2s | Best for distributed |

### Why Jitter Matters

```
WITHOUT jitter (thundering herd):
  10,000 clients timeout at the same time
  All retry after 1s → 10,000 requests hit server simultaneously
  All retry after 2s → another 10,000 simultaneous requests
  Server can never recover!

WITH jitter:
  Client 1: retry after 0.7s
  Client 2: retry after 1.3s
  Client 3: retry after 0.4s
  ...spread across time → server can handle gradual recovery

Jitter types:
  Full jitter:    random(0, base × 2^attempt)
  Equal jitter:   base × 2^attempt / 2 + random(0, base × 2^attempt / 2)
  Decorrelated:   random(base, previous_delay × 3)

Full jitter provides the best spread (recommended by AWS).
```

### The Complete Resilience Stack

```
Order of application (outside → inside):

  1. TIMEOUT (outermost) ─── Don't wait forever
  2. RETRY + BACKOFF ─────── Try again on transient failure
  3. CIRCUIT BREAKER ─────── Stop trying if dependency is down
  4. BULKHEAD ────────────── Limit concurrent calls
  5. ACTUAL CALL (innermost)

  call = timeout(10s,
           retry(3, exponential_backoff_with_jitter,
             circuit_breaker(threshold=5,
               bulkhead(max_concurrent=20,
                 actual_http_call()))))
```

---

## B. Interview View

### What Interviewers Expect

- Know when to retry and when not to
- Understand exponential backoff with jitter
- Can configure timeout budgets across service chains
- Combine retry with circuit breaker

### Red Flags

- Retrying non-idempotent operations without idempotency keys
- No backoff (hammering a failing service)
- No jitter (thundering herd problem)
- Timeout longer than upstream timeout (request already abandoned)

### Common Questions

1. When should you retry? When shouldn't you?
2. What is exponential backoff with jitter?
3. How do you set timeouts in a microservice chain?
4. How do retry and circuit breaker work together?
5. What is the thundering herd problem?

---

## C. Practical Engineering View

### Timeout Budget

```
Client has 10s total timeout. Service chain:

  Client (10s) → API Gateway (8s) → Service A (5s) → Service B (3s)
  
  Rules:
  • Each hop timeout < caller's timeout
  • Leave buffer for processing at each layer
  • Include retry time in budget
  
  Example with 1 retry:
    Service B: 3s timeout × 1 retry = 6s max
    Service A: must respond in 5s (including B calls)
    → Service A can only retry B once
    → If B fails twice, A returns error to gateway
    → Gateway has 3s buffer
```

### Retry Configuration by Service Type

```
Payment Gateway:
  Retries: 2 (with idempotency key)
  Backoff: Exponential with jitter (1s, 2-4s)
  Retry on: timeout, 500, 503
  Don't retry: 400, 402 (insufficient funds), 409

Database:
  Retries: 3
  Backoff: Fixed 100ms (connection pool retry)
  Retry on: connection error, deadlock
  Don't retry: constraint violation, syntax error

External API (3rd party):
  Retries: 3
  Backoff: Exponential with jitter (2s base, max 30s)
  Retry on: timeout, 429 (use Retry-After header), 500, 503
  Don't retry: 4xx (except 429)

Internal microservice:
  Retries: 1-2
  Backoff: Fixed 100-500ms
  Retry on: timeout, 503
  Circuit breaker: Yes (5 failures → open for 30s)
```

---

## D. Example: Resilient HTTP Client

```
Order Service calls Payment Service:

  Attempt 1: POST /payments (timeout: 3s)
    → Network timeout after 3s
  
  Wait: 1.2s (exponential backoff + jitter)
  
  Attempt 2: POST /payments (timeout: 3s, same idempotency key)
    → 500 Internal Server Error
  
  Wait: 2.7s (exponential backoff + jitter)
  
  Attempt 3: POST /payments (timeout: 3s, same idempotency key)
    → 200 OK { "payment_id": "pay_123", "status": "succeeded" }
  
  Total time: 3 + 1.2 + 3 + 2.7 + 3 = 12.9s
  (Within the caller's 15s timeout budget)
```

---

## E. HLD and LLD

### E.1 HLD — Resilient Service Mesh

```
┌──────────────────────────────────────────────────┐
│  Each service has a sidecar proxy (Envoy/Istio)  │
│  that handles retry, timeout, and circuit breaking│
│                                                    │
│  ┌─────┐  ┌───────┐        ┌───────┐  ┌─────┐   │
│  │Svc A│──│Envoy  │──net──►│Envoy  │──│Svc B│   │
│  └─────┘  │Sidecar│        │Sidecar│  └─────┘   │
│           │• 3s timeout│    │       │             │
│           │• 2 retries│     │       │             │
│           │• exp backoff│   │       │             │
│           │• CB: 5 fail│    │       │             │
│           └───────┘        └───────┘             │
│                                                    │
│  Config managed centrally (Istio control plane)   │
│  No code changes needed in services               │
└──────────────────────────────────────────────────┘
```

### E.2 LLD — Retry with Backoff

```python
import time
import random

class RetryConfig:
    def __init__(self, max_retries=3, base_delay=1.0, max_delay=30.0,
                 backoff="exponential_jitter",
                 retryable_exceptions=(TimeoutError, ConnectionError),
                 retryable_status_codes=(500, 502, 503, 429)):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff = backoff
        self.retryable_exceptions = retryable_exceptions
        self.retryable_status_codes = retryable_status_codes


def retry_with_backoff(func, config: RetryConfig):
    last_exception = None
    
    for attempt in range(config.max_retries + 1):
        try:
            result = func()
            
            # Check for retryable HTTP status
            if hasattr(result, 'status_code'):
                if result.status_code in config.retryable_status_codes:
                    if attempt < config.max_retries:
                        delay = _calculate_delay(config, attempt, result)
                        time.sleep(delay)
                        continue
                    return result  # Last attempt, return as-is
            
            return result  # Success
            
        except config.retryable_exceptions as e:
            last_exception = e
            if attempt < config.max_retries:
                delay = _calculate_delay(config, attempt)
                log.warn(f"Attempt {attempt+1} failed: {e}. Retrying in {delay:.1f}s")
                time.sleep(delay)
            else:
                raise  # Max retries exhausted

    raise last_exception


def _calculate_delay(config, attempt, response=None):
    # Respect Retry-After header (for 429 responses)
    if response and hasattr(response, 'headers'):
        retry_after = response.headers.get('Retry-After')
        if retry_after:
            return min(float(retry_after), config.max_delay)

    if config.backoff == "exponential_jitter":
        # Full jitter: random(0, base * 2^attempt)
        max_delay = min(config.base_delay * (2 ** attempt), config.max_delay)
        return random.uniform(0, max_delay)
    elif config.backoff == "exponential":
        return min(config.base_delay * (2 ** attempt), config.max_delay)
    elif config.backoff == "linear":
        return min(config.base_delay * (attempt + 1), config.max_delay)
    else:
        return config.base_delay  # Fixed
```

---

## F. Summary & Practice

### Key Takeaways

1. **Timeout**: always set one; never wait indefinitely
2. **Retry**: only for transient failures; never for client errors (4xx)
3. **Exponential backoff**: delay doubles each attempt (1s, 2s, 4s, 8s)
4. **Jitter**: randomize delay to prevent thundering herd
5. **Timeout budget**: each hop < caller timeout; include retry time
6. Only retry **idempotent** operations (or use idempotency keys)
7. Combine: **timeout → retry → circuit breaker → bulkhead**
8. Respect **Retry-After** headers from the server
9. Service mesh (Envoy/Istio) can handle retry/timeout without code changes
10. Set **max retries** (typically 2-3) with a **max delay cap**

### Interview Questions

1. When should you retry and when shouldn't you?
2. What is exponential backoff with jitter? Why jitter?
3. How do you set timeouts in a microservice chain?
4. What is the thundering herd problem? How do you prevent it?
5. How do retry and circuit breaker work together?
6. Design the resilience configuration for a payment flow.
7. What is a timeout budget?

### Practice Exercises

1. **Exercise 1**: Implement exponential backoff with full jitter. Test with 100 concurrent clients hitting a failing endpoint and show how jitter spreads the retries.
2. **Exercise 2**: Design timeout budgets for a 4-service chain with a 10s total timeout. How many retries can you afford at each layer?
3. **Exercise 3**: Your service retries on 500 errors without backoff. During a partial outage, retries are making things worse. Redesign with backoff + circuit breaker.

---

> **Previous**: [22 — Circuit Breaker](22-circuit-breaker.md)
> **Next**: [24 — Service Discovery](24-service-discovery.md)
