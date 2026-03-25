# Topic 36: Observability

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–35

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

### What is Observability?

**Observability** is the ability to understand the internal state of a system by examining its outputs. It answers: "What is happening inside the system right now, and why?"

```
MONITORING: "Is the system working?"  (known-unknowns)
  → Dashboards, alerts, uptime checks

OBSERVABILITY: "WHY is the system behaving this way?" (unknown-unknowns)
  → Explore, correlate, drill down into any question

Observability = Monitoring + ability to ask arbitrary questions about system state
```

### Three Pillars of Observability

```
┌──────────────────────────────────────────────────┐
│              OBSERVABILITY                         │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  LOGS    │  │ METRICS  │  │ TRACES   │       │
│  │          │  │          │  │          │       │
│  │ What     │  │ How much │  │ Where    │       │
│  │ happened │  │ / how    │  │ (across  │       │
│  │ (events) │  │ fast     │  │ services)│       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                    │
│  Logs: Discrete events with context               │
│  Metrics: Numeric measurements over time           │
│  Traces: Request path across services              │
└──────────────────────────────────────────────────┘
```

### Logs

```
Structured log (JSON — preferred):
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "level": "ERROR",
    "service": "payment-service",
    "trace_id": "abc123",
    "user_id": "usr_789",
    "message": "Payment failed",
    "error": "Card declined",
    "amount": 99.99,
    "duration_ms": 250
  }

Log levels:
  DEBUG:   Detailed debugging (dev only, never in prod)
  INFO:    Normal operations ("Order created", "User logged in")
  WARN:    Unexpected but handled ("Retry succeeded on 2nd attempt")
  ERROR:   Failure requiring attention ("Payment failed")
  FATAL:   System cannot continue ("Database connection lost")

Log aggregation tools:
  ELK Stack (Elasticsearch + Logstash + Kibana)
  Loki + Grafana (lightweight, label-based)
  Datadog Logs
  Splunk
  AWS CloudWatch Logs
```

### Metrics

```
Numeric measurements collected over time:

TYPES:
  Counter:   Monotonically increasing (total_requests, error_count)
  Gauge:     Current value (cpu_usage, active_connections, queue_depth)
  Histogram: Distribution of values (request_duration_ms, response_size)
  Summary:   Pre-calculated percentiles (p50, p95, p99 latency)

KEY METRICS (RED method for services):
  Rate:    Requests per second
  Errors:  Error rate (errors / total requests)
  Duration: Latency percentiles (p50, p95, p99)

KEY METRICS (USE method for resources):
  Utilization: % of resource used (CPU 80%)
  Saturation:  Queue depth, backlog
  Errors:      Resource errors (disk I/O errors)

Tools:
  Prometheus + Grafana (industry standard, pull-based)
  Datadog (SaaS, full-featured)
  CloudWatch Metrics (AWS)
  StatsD + Graphite
  InfluxDB + Telegraf
```

### Traces (Distributed Tracing)

```
A trace follows a single request across multiple services:

  User clicks "Buy" → API Gateway → Order Service → Payment Service → Inventory → Email

  Trace ID: trace_abc123
  ┌──────────────────────────────────────────────────────┐
  │ Span: API Gateway          [0ms ─────── 500ms]      │
  │   └─ Span: Order Service     [50ms ──── 450ms]      │
  │       ├─ Span: Payment Svc    [100ms ── 350ms]      │
  │       │   └─ Span: Stripe API   [150ms ─ 300ms]     │
  │       ├─ Span: Inventory Svc  [360ms ── 420ms]      │
  │       └─ Span: Email Svc      [430ms ── 445ms]      │
  └──────────────────────────────────────────────────────┘

  Each span: service, operation, start_time, duration, status, tags
  Trace ID propagated via HTTP header: X-Trace-Id: trace_abc123

  "Why was this request slow?"
  → Look at trace → Payment/Stripe span took 200ms (bottleneck!)

Tools:
  Jaeger (open source, CNCF)
  Zipkin (open source)
  Datadog APM
  AWS X-Ray
  OpenTelemetry (standard SDK for all three pillars)
```

### OpenTelemetry (OTel)

```
The vendor-neutral standard for observability instrumentation:

  App code → OTel SDK → OTel Collector → Backend (Jaeger, Prometheus, etc.)

  Supports: Traces, Metrics, Logs (unified API)
  Languages: Java, Python, Go, Node.js, .NET, C++, Rust
  
  Benefits:
  • Instrument once, send to any backend
  • No vendor lock-in
  • Auto-instrumentation for common frameworks (Express, Spring, Flask)
  • W3C Trace Context standard for trace propagation
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows logging and basic metrics |
| **Mid** | Knows three pillars; mentions Prometheus + Grafana |
| **Senior** | Designs observability strategy; SLOs, alerting, tracing |
| **Staff+** | Observability-driven development; cost optimization; cardinality management |

### Red Flags

- Not mentioning observability in a system design
- Only logging, no metrics or tracing
- No alerting strategy
- Not correlating logs, metrics, and traces

### Common Questions

1. What is observability? How does it differ from monitoring?
2. What are the three pillars of observability?
3. How does distributed tracing work?
4. What metrics would you track for this service?
5. How do you set up alerting?
6. What is OpenTelemetry?

---

## C. Practical Engineering View

### SLOs and Alerting

```
SLI (Service Level Indicator): A metric that measures service quality
  Example: "99.5% of requests complete in < 200ms"

SLO (Service Level Objective): Target for an SLI
  Example: "p99 latency < 500ms, availability > 99.9%"

Error Budget: How much failure is allowed
  99.9% availability = 0.1% error budget = 8.7 hours/year of downtime

Alerting based on SLOs (burn rate):
  If error budget consumed at 10× normal rate for 5 min → Page on-call
  If error budget consumed at 2× normal rate for 1 hour → Warning
  If 50% of monthly error budget consumed → Review meeting

Multi-window alerting (Google SRE):
  Short window (5 min) + Long window (1 hour) = reduces false alarms
  Both must fire → page
```

### Alerting Best Practices

```
GOOD alerts:
  ✓ Actionable: Someone can DO something about it
  ✓ Symptom-based: "Users are seeing errors" not "CPU is high"
  ✓ Proportional: Severity matches business impact
  ✓ Deduplicated: Not 100 alerts for the same issue

BAD alerts:
  ✗ "CPU > 80%": Is anything actually broken? (cause-based, not symptom)
  ✗ Alert on every warning log: Too noisy, alert fatigue
  ✗ No runbook: On-call doesn't know what to do
  ✗ Alert without context: "Error rate high" — which service? which endpoint?

Alert tiers:
  P1 (Page): User-facing outage, data loss risk → immediate response
  P2 (Alert): Degraded service, approaching SLO breach → respond in 30 min
  P3 (Ticket): Non-urgent issue → investigate during business hours
  P4 (Log): Informational, no action needed
```

### Dashboards

```
Four golden signals dashboard:

  ┌─────────────────────────────────────────────┐
  │  SERVICE: payment-service                    │
  │                                               │
  │  Traffic (RPS):  ████████████████  1,200/s   │
  │  Error Rate:     ██                0.5%      │
  │  Latency (p99):  ████████         180ms     │
  │  Saturation:     ██████████       65% CPU   │
  │                                               │
  │  [Request Rate]  [Error Rate]  [Latency]     │
  │  ┌──────────┐   ┌──────────┐  ┌──────────┐  │
  │  │ ╱╲  ╱╲   │   │          │  │     ╱╲    │  │
  │  │╱  ╲╱  ╲  │   │  ─────   │  │ ───╱  ╲── │  │
  │  └──────────┘   └──────────┘  └──────────┘  │
  └─────────────────────────────────────────────┘
```

---

## D. Example: Observability Stack for Microservices

```
┌──────────────────────────────────────────────────────────┐
│  Services (instrumented with OpenTelemetry)               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │Order │ │Pay   │ │Inv   │ │User  │                   │
│  │Svc   │ │Svc   │ │Svc   │ │Svc   │                   │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘                   │
│     └────────┼────────┼────────┘                        │
│              ▼                                           │
│  ┌─────────────────────────┐                            │
│  │  OTel Collector         │ (receives traces, metrics, │
│  │  (central aggregation)  │  logs from all services)   │
│  └────┬──────┬──────┬─────┘                            │
│       │      │      │                                   │
│  ┌────┴──┐ ┌┴────┐ ┌┴────────┐                        │
│  │Jaeger │ │Prom │ │Loki     │                        │
│  │Traces │ │Metrics│ │Logs    │                        │
│  └───┬───┘ └──┬──┘ └──┬──────┘                        │
│      └────────┼───────┘                                │
│          ┌────┴────┐                                    │
│          │ Grafana │ (unified dashboards + alerts)      │
│          └────┬────┘                                    │
│               │                                         │
│          ┌────┴────────┐                                │
│          │ PagerDuty   │ (incident management)          │
│          └─────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Observability Platform

```
┌──────────────────────────────────────────────────────────┐
│  Application Layer                                         │
│  (OTel SDK auto-instrumented)                             │
│      │                                                     │
│  ┌───┴───────────────────────────┐                        │
│  │  OTel Collector (×3 replicas) │                        │
│  │  Receives, processes, exports │                        │
│  └───┬──────────┬───────────┬────┘                        │
│      │          │           │                              │
│  ┌───┴────┐ ┌──┴────┐ ┌───┴──────┐                      │
│  │Metrics │ │Traces │ │Logs      │                      │
│  │Prom    │ │Jaeger │ │Loki/ELK  │                      │
│  │(15d)   │ │(7d)   │ │(30d)     │                      │
│  └───┬────┘ └──┬────┘ └───┬──────┘                      │
│      └─────────┼──────────┘                              │
│           ┌────┴────┐                                     │
│           │ Grafana │  Unified: dashboards, explore,     │
│           │         │  alerts, correlate across pillars   │
│           └────┬────┘                                     │
│                │ alerts                                    │
│           ┌────┴────┐                                     │
│           │PagerDuty│ → on-call → Slack notification     │
│           └─────────┘                                     │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Instrumentation Middleware

```python
import time
import uuid
from opentelemetry import trace, metrics

tracer = trace.get_tracer("payment-service")
meter = metrics.get_meter("payment-service")

# Metrics
request_counter = meter.create_counter("http_requests_total")
request_duration = meter.create_histogram("http_request_duration_ms")
error_counter = meter.create_counter("http_errors_total")

class ObservabilityMiddleware:
    def __init__(self, logger):
        self.logger = logger

    def handle(self, request, next_handler):
        # Extract or create trace context
        trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
        
        with tracer.start_as_current_span(
            f"{request.method} {request.path}",
            attributes={
                "http.method": request.method,
                "http.url": request.path,
                "user.id": request.user_id,
            }
        ) as span:
            start_time = time.time()
            status_code = 500  # Default to error
            
            try:
                response = next_handler(request)
                status_code = response.status_code
                span.set_attribute("http.status_code", status_code)
                return response
                
            except Exception as e:
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(e))
                error_counter.add(1, {"path": request.path, "error": type(e).__name__})
                
                self.logger.error("Request failed", extra={
                    "trace_id": trace_id,
                    "path": request.path,
                    "error": str(e),
                    "user_id": request.user_id,
                })
                raise
                
            finally:
                duration_ms = (time.time() - start_time) * 1000
                request_counter.add(1, {
                    "method": request.method,
                    "path": request.path,
                    "status": str(status_code),
                })
                request_duration.record(duration_ms, {
                    "method": request.method,
                    "path": request.path,
                })
                
                self.logger.info("Request completed", extra={
                    "trace_id": trace_id,
                    "method": request.method,
                    "path": request.path,
                    "status": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "user_id": request.user_id,
                })
```

---

## F. Summary & Practice

### Key Takeaways

1. **Observability** = understanding system internals from external outputs
2. **Three pillars**: Logs (events), Metrics (numbers over time), Traces (request paths)
3. **Structured logging** (JSON) enables searching and filtering at scale
4. **RED method** for services: Rate, Errors, Duration
5. **USE method** for resources: Utilization, Saturation, Errors
6. **Distributed tracing** follows a request across services via trace ID
7. **OpenTelemetry** is the vendor-neutral standard for instrumentation
8. **SLO-based alerting** reduces noise; alert on user-facing symptoms, not causes
9. **Grafana + Prometheus + Jaeger + Loki** = standard open-source observability stack
10. Correlate across pillars: trace ID links logs, metrics, and traces

### Interview Questions

1. What is observability? How does it differ from monitoring?
2. What are the three pillars of observability?
3. How does distributed tracing work?
4. What metrics would you track for a payment service?
5. How do you set up alerting that avoids alert fatigue?
6. What is OpenTelemetry?
7. Design the observability stack for a 20-microservice system.

### Practice Exercises

1. **Exercise 1**: Design the observability strategy for an e-commerce platform. Specify metrics, logs, traces, dashboards, and alerting rules for each service.
2. **Exercise 2**: A user reports "checkout is slow." Using observability tools, describe the investigation process from alert to root cause.
3. **Exercise 3**: Your team gets 50 alerts/day and most are false alarms. Redesign the alerting strategy using SLO-based alerting.

---

> **Previous**: [35 — Batch Processing](35-batch-processing.md)
> **Next**: [37 — Logging, Metrics, Tracing](37-logging-metrics-tracing.md)
