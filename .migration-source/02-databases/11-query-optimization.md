# Topic 11: Query Optimization

> **Track**: Databases and Storage
> **Difficulty**: Intermediate → Advanced
> **Prerequisites**: Indexing Strategy, Schema Design

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

### What is Query Optimization?

**Query optimization** is the process of rewriting queries, restructuring schemas, and configuring the database to minimize execution time and resource usage. The database's **query planner** chooses an execution plan, but it's the engineer's job to give it the best possible conditions.

```
Query lifecycle:
  1. SQL text received
  2. PARSE: Syntax check, build parse tree
  3. PLAN: Query planner considers multiple execution strategies
     • Which indexes to use
     • Join order and algorithm (nested loop, hash join, merge join)
     • Whether to scan or seek
  4. EXECUTE: Run the chosen plan
  5. RETURN: Stream results to client

  You optimize by:
  • Writing efficient SQL
  • Creating the right indexes
  • Providing accurate statistics (ANALYZE)
  • Structuring data to match query patterns
```

### Common Query Anti-Patterns

```
1. SELECT * (fetches all columns):
   BAD:  SELECT * FROM orders WHERE user_id = 123
   GOOD: SELECT id, total, status FROM orders WHERE user_id = 123
   Why: Reads less data, enables index-only scans

2. N+1 QUERY PROBLEM:
   BAD:  users = SELECT * FROM users LIMIT 100
         for user in users:
             orders = SELECT * FROM orders WHERE user_id = user.id
         → 101 queries!
   
   GOOD: SELECT u.*, o.* FROM users u
         JOIN orders o ON u.id = o.user_id
         LIMIT 100
         → 1 query

3. FUNCTIONS ON INDEXED COLUMNS:
   BAD:  WHERE LOWER(email) = 'alice@example.com'
         → Can't use index on email (function wraps column)
   GOOD: WHERE email = 'alice@example.com'
         (store normalized, or create expression index)
   
   Or: CREATE INDEX idx_email_lower ON users(LOWER(email));

4. IMPLICIT TYPE CASTING:
   BAD:  WHERE user_id = '123'  (user_id is INT, comparing to STRING)
         → May skip index due to type cast
   GOOD: WHERE user_id = 123

5. LIKE WITH LEADING WILDCARD:
   BAD:  WHERE name LIKE '%alice%'  → full table scan
   OK:   WHERE name LIKE 'alice%'   → can use B-tree index
   GOOD: Use full-text search for substring matching

6. OR CONDITIONS:
   BAD:  WHERE status = 'active' OR status = 'pending'
         → May not use index efficiently
   GOOD: WHERE status IN ('active', 'pending')
```

### Join Algorithms

```
The database chooses a join algorithm based on data size and indexes:

1. NESTED LOOP JOIN:
   For each row in Table A, scan Table B for matches.
   Best when: One table is small, or inner table has an index.
   Cost: O(N × M) worst case, O(N × log M) with index on inner.

2. HASH JOIN:
   Build hash table from smaller table, probe with larger table.
   Best when: No useful index, both tables are large.
   Cost: O(N + M) but needs memory for hash table.

3. MERGE JOIN:
   Both tables sorted on join key, merge like merge-sort.
   Best when: Both tables already sorted (index on join column).
   Cost: O(N + M) but requires sorted input.

  PostgreSQL chooses automatically based on cost estimation.
  You influence the choice by:
  • Creating indexes on join columns → nested loop or merge join
  • Increasing work_mem → allows larger hash joins in memory
  • ANALYZE to update statistics → better cost estimates
```

### Pagination

```
OFFSET-based (simple but slow for deep pages):
  SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
  → Database must skip 10,000 rows → slow at deep offsets

KEYSET (cursor-based) pagination (fast for any page):
  SELECT * FROM products
  WHERE created_at < '2024-01-15T10:00:00'
  ORDER BY created_at DESC
  LIMIT 20;
  → Uses index, skips nothing, constant performance

  Client sends: "give me 20 items after cursor X"
  Server returns: items + next cursor (last item's created_at)

  Keyset is O(log n) for any "page" vs O(n) for OFFSET.
  Use keyset for infinite scroll, feeds, large datasets.
  Use OFFSET only for small datasets or admin pages.
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows to avoid SELECT *, understands N+1 problem |
| **Mid** | Can read EXPLAIN output, knows join types, pagination strategies |
| **Senior** | Cost-based optimization, query rewriting, partitioning for performance |
| **Staff+** | Connection pooling, prepared statements, query caching, DB tuning |

### Red Flags

- Writing SELECT * in production queries
- Not knowing about N+1 queries
- Not being able to read EXPLAIN output
- Using OFFSET for deep pagination

### Common Questions

1. How do you optimize a slow SQL query?
2. What is the N+1 query problem?
3. Compare OFFSET and keyset pagination.
4. What join algorithms does PostgreSQL use?
5. How do you identify and fix slow queries in production?

---

## C. Practical Engineering View

### Connection Pooling

```
Problem: Each DB connection costs ~10 MB RAM + setup time.
  1000 app servers × 10 connections each = 10,000 connections → DB OOM

Solution: Connection pooler between app and DB.

  ┌──────────┐     ┌──────────────┐     ┌──────────┐
  │ App (1000│────►│ PgBouncer    │────►│PostgreSQL│
  │ conns)   │     │ (50 pooled   │     │ (50 real │
  └──────────┘     │  connections)│     │  conns)  │
                   └──────────────┘     └──────────┘

  Modes:
  • Session pooling: 1 client = 1 server conn for session duration
  • Transaction pooling: conn returned after each transaction (most efficient)
  • Statement pooling: conn returned after each statement

  PgBouncer settings:
    pool_size = 50          # max DB connections
    max_client_conn = 10000 # max app connections
    pool_mode = transaction
```

### Prepared Statements

```
Reuse query plans for repeated queries:

  BAD (parse + plan every time):
    cursor.execute("SELECT * FROM users WHERE id = 123")
    cursor.execute("SELECT * FROM users WHERE id = 456")
    → Parse + plan each time

  GOOD (parse + plan once, execute many):
    stmt = cursor.prepare("SELECT * FROM users WHERE id = $1")
    stmt.execute(123)
    stmt.execute(456)
    → Parse + plan once, just execute with different params

  Also prevents SQL injection (parameters are never interpolated into SQL).
```

### Materialized Views

```sql
-- Pre-compute expensive aggregations

CREATE MATERIALIZED VIEW daily_revenue AS
  SELECT date_trunc('day', created_at) AS day,
         count(*) AS order_count,
         sum(total) AS revenue,
         avg(total) AS avg_order_value
  FROM orders
  WHERE status = 'completed'
  GROUP BY day;

CREATE UNIQUE INDEX idx_daily_revenue ON daily_revenue(day);

-- Query: instant (reads pre-computed table)
SELECT * FROM daily_revenue WHERE day >= '2024-01-01';

-- Refresh: run periodically (e.g., every hour)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;

-- CONCURRENTLY: doesn't lock reads during refresh
-- Requires a unique index on the materialized view

-- Best for: dashboards, reports, analytics queries
-- Not for: real-time data (stale by refresh interval)
```

### Partitioning for Query Performance

```sql
-- Partition large tables by date for faster queries

CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    event_type TEXT,
    user_id UUID,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_2024_02 PARTITION OF events
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Query automatically uses partition pruning:
SELECT * FROM events WHERE created_at >= '2024-02-01' AND created_at < '2024-03-01';
-- Only scans events_2024_02 partition → much faster

-- Drop old data instantly:
DROP TABLE events_2023_01;  -- Instant, no vacuum needed
```

---

## D. Example: Optimizing a Dashboard Query

```sql
-- BEFORE: 12 seconds on 50M rows
SELECT
    date_trunc('hour', created_at) AS hour,
    status,
    count(*) AS order_count,
    sum(total) AS revenue
FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'
GROUP BY hour, status
ORDER BY hour;

-- EXPLAIN ANALYZE shows: Seq Scan on orders, 50M rows scanned

-- OPTIMIZATION STEPS:

-- 1. Add index (still slow — aggregation over 5M matching rows)
CREATE INDEX idx_orders_created ON orders(created_at);

-- 2. Partition by month
ALTER TABLE orders RENAME TO orders_old;
CREATE TABLE orders (...) PARTITION BY RANGE (created_at);
-- Migrate data to partitions
-- Now: only scans Jan 2024 partition (5M rows instead of 50M)

-- 3. Create materialized view for dashboard
CREATE MATERIALIZED VIEW hourly_order_stats AS
  SELECT date_trunc('hour', created_at) AS hour,
         status, count(*) AS order_count, sum(total) AS revenue
  FROM orders GROUP BY hour, status;
REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_order_stats;

-- 4. Query the materialized view
SELECT * FROM hourly_order_stats
WHERE hour >= '2024-01-01' AND hour < '2024-02-01'
ORDER BY hour;

-- AFTER: 5ms (reads pre-computed, indexed materialized view)
-- Improvement: 12,000ms → 5ms (2,400× faster)
```

---

## E. HLD and LLD

### E.1 HLD — Query Performance Infrastructure

```
┌──────────────────────────────────────────────────────────┐
│  Application                                               │
│  ┌────────────────────────────────────────┐               │
│  │  ORM / Query Builder                   │               │
│  │  • Eager loading (avoid N+1)           │               │
│  │  • Select specific columns             │               │
│  │  • Prepared statements                 │               │
│  │  • Keyset pagination                   │               │
│  └──────────────┬─────────────────────────┘               │
│                 │                                          │
│  ┌──────────────┴─────────────────────────┐               │
│  │  Connection Pooler (PgBouncer)         │               │
│  │  50 pooled connections                 │               │
│  └──────────────┬─────────────────────────┘               │
│                 │                                          │
│  ┌──────────────┴─────────────────────────┐               │
│  │  PostgreSQL                            │               │
│  │  • Partitioned tables (by date)        │               │
│  │  • Optimized indexes                   │               │
│  │  • Materialized views (hourly refresh) │               │
│  │  • Read replicas (analytics queries)   │               │
│  │  • pg_stat_statements (monitoring)     │               │
│  └────────────────────────────────────────┘               │
│                                                            │
│  Monitoring:                                              │
│  pg_stat_statements → Prometheus → Grafana                │
│  Slow query log → Alert on queries > 1s                   │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Query Optimizer Helper

```python
class QueryOptimizer:
    """Helpers for building optimized queries"""
    
    def __init__(self, db_pool):
        self.db = db_pool

    def paginate_keyset(self, table: str, columns: list,
                       order_col: str, order_dir: str = "DESC",
                       cursor_value=None, limit: int = 20,
                       filters: dict = None) -> dict:
        """Keyset pagination — O(log n) for any page depth"""
        cols = ", ".join(columns)
        where_parts = []
        params = {}

        if filters:
            for key, value in filters.items():
                where_parts.append(f"{key} = %({key})s")
                params[key] = value

        if cursor_value is not None:
            op = "<" if order_dir == "DESC" else ">"
            where_parts.append(f"{order_col} {op} %(cursor)s")
            params["cursor"] = cursor_value

        where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""
        params["limit"] = limit + 1  # Fetch one extra to detect "has more"

        query = f"""
            SELECT {cols} FROM {table}
            {where_clause}
            ORDER BY {order_col} {order_dir}
            LIMIT %(limit)s
        """
        rows = self.db.execute(query, params)
        
        has_more = len(rows) > limit
        items = rows[:limit]
        next_cursor = items[-1][order_col] if items and has_more else None

        return {
            "items": items,
            "next_cursor": next_cursor,
            "has_more": has_more,
        }

    def batch_get(self, table: str, ids: list, id_col: str = "id",
                  columns: list = None) -> list:
        """Batch fetch by IDs (avoids N+1)"""
        if not ids:
            return []
        cols = ", ".join(columns) if columns else "*"
        placeholders = ", ".join(["%s"] * len(ids))
        query = f"SELECT {cols} FROM {table} WHERE {id_col} IN ({placeholders})"
        return self.db.execute(query, ids)

    def explain_query(self, query: str, params=None) -> dict:
        """Run EXPLAIN ANALYZE and parse results"""
        explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
        result = self.db.execute(explain_query, params)
        plan = result[0][0][0]

        return {
            "execution_time_ms": plan["Execution Time"],
            "planning_time_ms": plan["Planning Time"],
            "plan": plan["Plan"]["Node Type"],
            "total_cost": plan["Plan"]["Total Cost"],
            "actual_rows": plan["Plan"].get("Actual Rows"),
            "shared_hit_blocks": plan["Plan"].get("Shared Hit Blocks", 0),
            "shared_read_blocks": plan["Plan"].get("Shared Read Blocks", 0),
        }
```

---

## F. Summary & Practice

### Key Takeaways

1. **Avoid SELECT \***: fetch only needed columns for less I/O and index-only scans
2. **Fix N+1 queries**: use JOINs or batch fetching instead of loops
3. **Keyset pagination** over OFFSET for large datasets — O(log n) vs O(n)
4. **Join algorithms**: nested loop (indexed), hash join (large tables), merge join (sorted)
5. **Connection pooling** (PgBouncer): reduce 10K app connections to 50 DB connections
6. **Prepared statements**: parse and plan once, execute many times
7. **Materialized views**: pre-compute expensive aggregations, refresh periodically
8. **Table partitioning**: prune irrelevant partitions, instant old data deletion
9. **EXPLAIN ANALYZE** every slow query — look for Seq Scans, high row counts
10. Monitor with **pg_stat_statements** — find top queries by total execution time

### Interview Questions

1. How do you optimize a slow SQL query?
2. What is the N+1 query problem? How do you fix it?
3. Compare OFFSET and keyset pagination.
4. What are materialized views? When would you use them?
5. How does connection pooling work?
6. Walk through reading an EXPLAIN ANALYZE output.

### Practice Exercises

1. **Exercise 1**: A dashboard query takes 15 seconds on 100M rows. Show step-by-step optimization: indexing, partitioning, materialized views. Target: <50ms.
2. **Exercise 2**: Your ORM generates N+1 queries for a page showing 50 users with their latest order and order items. Rewrite as 1-2 optimized SQL queries.
3. **Exercise 3**: Design a query performance monitoring system: collect slow queries, auto-suggest indexes, alert on regressions, generate weekly reports.

---

> **Previous**: [10 — Indexing Strategy](10-indexing-strategy.md)
> **Next**: [12 — Data Archival](12-data-archival.md)
