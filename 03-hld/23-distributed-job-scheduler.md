# HLD 23: Distributed Job Scheduler

> **Difficulty**: Hard
> **Key Concepts**: Cron, at-least-once execution, priority queues, leader election

---

## 1. Requirements

### Functional Requirements

- Schedule jobs: one-time, recurring (cron), delayed
- Execute jobs reliably (at-least-once guarantee)
- Priority levels (critical, high, normal, low)
- Job status tracking (pending, running, completed, failed)
- Retry failed jobs with exponential backoff
- Job dependencies (run B after A completes)
- Dashboard: view jobs, logs, metrics

### Non-Functional Requirements

- **Reliability**: No missed executions, no duplicate runs (ideally)
- **Scale**: 10M jobs/day, 10K concurrent executions
- **Latency**: Job picked up within 1s of scheduled time
- **Availability**: 99.99% (scheduler is infrastructure-critical)
- **Fault-tolerant**: Worker crash → job re-queued automatically

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────┐       ┌──────────────────┐                 │
│  │ API / CLI    │──────►│  Scheduler       │                 │
│  │ (submit job) │       │  Service         │                 │
│  └──────────────┘       │  (cron trigger,  │                 │
│                          │   job dispatch)  │                 │
│                          └────────┬─────────┘                 │
│                                   │                            │
│                          ┌────────┴─────────┐                 │
│                          │  Job Queue       │                 │
│                          │  (Kafka/Redis)   │                 │
│                          │  priority-based  │                 │
│                          └────────┬─────────┘                 │
│                                   │                            │
│              ┌────────────────────┼────────────────┐         │
│              │                    │                 │         │
│        ┌─────┴─────┐  ┌──────────┴──┐  ┌──────────┴──┐    │
│        │ Worker 1  │  │ Worker 2    │  │ Worker N    │    │
│        │ (executor)│  │ (executor)  │  │ (executor)  │    │
│        └───────────┘  └─────────────┘  └─────────────┘    │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │PostgreSQL  │  │ Redis       │  │ Kafka        │        │
│  │(job defs,  │  │ (locks,     │  │ (job events, │        │
│  │ history)   │  │  heartbeat) │  │  dead letter)│        │
│  └────────────┘  └─────────────┘  └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Key Design Decisions

### Job Dispatch (Cron Trigger)

```
Recurring jobs defined with cron expressions:
  job: "generate_daily_report"
  cron: "0 2 * * *"  (every day at 2 AM)

Scheduler service:
  1. Leader election (only ONE scheduler triggers jobs — prevents duplicates)
     Use Redis SETNX or ZooKeeper for leader lock
     
  2. Every second, check: "Which jobs are due NOW?"
     SELECT * FROM jobs WHERE next_run_at <= now() AND status = 'scheduled'
     
  3. For each due job:
     a. Mark as 'queued' in DB (optimistic lock: WHERE status = 'scheduled')
     b. Push to job queue (Kafka topic by priority)
     c. Calculate next_run_at from cron expression, update DB
     
  4. If scheduler crashes → new leader takes over
     Jobs already marked 'queued' won't be re-dispatched (idempotent)
```

### Worker Execution

```
Workers pull jobs from queue:

  1. Worker picks job from Kafka/Redis queue
  2. Set heartbeat in Redis: SET worker:{id}:heartbeat now() EX 30
  3. Execute job (call the job's function/endpoint)
  4. Update heartbeat every 10s (proves worker is alive)
  5. On completion:
     a. Mark job as 'completed' in DB
     b. Emit event: job.completed (for dependent jobs)
  6. On failure:
     a. Increment retry_count
     b. If retry_count < max_retries → re-queue with backoff delay
     c. If retry_count >= max_retries → mark as 'failed', alert
     d. Move to dead-letter queue for manual investigation

  Worker crash detection:
    Monitor service checks heartbeats every 30s
    If heartbeat expired → worker is dead → re-queue the job
    Job must be idempotent (may execute more than once)
```

### Job Dependencies (DAG)

```
Job B depends on Job A:

  jobs:
    id: A, dependencies: []
    id: B, dependencies: [A]
    id: C, dependencies: [A, B]

  When A completes → check: "Which jobs have A as a dependency?"
    B: dependencies = [A] → all deps met → enqueue B
    C: dependencies = [A, B] → B not done → wait

  Implementation:
    dep_status:
      job_id | dependency_id | status
      B      | A             | completed ✓
      C      | A             | completed ✓
      C      | B             | pending

    On job completion: UPDATE dep_status, then:
      SELECT job_id FROM dep_status
      GROUP BY job_id
      HAVING COUNT(*) = COUNT(CASE WHEN status = 'completed' THEN 1 END)
      → These jobs have all deps met → enqueue them
```

---

## 4. Scaling & Bottlenecks

```
Scheduler (single leader):
  Only one scheduler active (leader lock)
  If it can't keep up: Shard by job group (scheduler A: reports, B: emails)

Workers (horizontal scale):
  Add more workers → more parallel execution
  Auto-scale based on queue depth
  100 workers × 100 jobs/worker/min = 10K jobs/min

Queue:
  Kafka: Partitioned by priority, ordered within partition
  Redis sorted set: ZADD jobs {execute_at_timestamp} {job_id}
    Workers: ZPOPMIN → get job with earliest execute time

Job store:
  PostgreSQL: Partition job_history by month (grows fast)
  Archive completed jobs older than 90 days
```

---

## 5. Trade-offs

| Decision | Trade-off |
|----------|-----------|
| At-least-once vs exactly-once | Reliability vs idempotency requirement |
| Single scheduler vs distributed | Simplicity vs throughput |
| Kafka vs Redis queue | Durability vs latency |
| Heartbeat interval (10s vs 30s) | Quick failure detection vs overhead |

---

## 6. Summary

- **Scheduler**: Single leader triggers due jobs, pushes to priority queue
- **Workers**: Pull from queue, execute, heartbeat, retry on failure
- **Reliability**: At-least-once with idempotency, heartbeat-based crash detection
- **Dependencies**: DAG-based, enqueue when all deps completed
- **Scale**: Horizontal workers, Kafka/Redis queue, partitioned job history

> **Next**: [24 — Logging / Monitoring System](24-logging-monitoring-system.md)
