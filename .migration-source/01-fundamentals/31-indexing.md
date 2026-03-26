# Topic 31: Indexing

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–30

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

### What is an Index?

A database **index** is a data structure that improves the speed of data retrieval at the cost of additional storage and slower writes. Like a book's index — instead of reading every page, you look up the topic and jump to the right page.

```
WITHOUT index:
  SELECT * FROM users WHERE email = 'alice@example.com'
  → Full table scan: check EVERY row (10M rows = slow)
  → O(N) time

WITH index on email:
  → B-tree lookup: jump directly to the matching row
  → O(log N) time

  10M rows: Full scan ~10s → Index lookup ~1ms (10,000× faster)
```

### Index Types

| Type | Structure | Best For | Example |
|------|-----------|----------|---------|
| **B-Tree** | Balanced tree | Equality + range queries | Most default indexes |
| **Hash** | Hash table | Equality only (exact match) | Key lookups, in-memory DBs |
| **GiST** | Generalized search tree | Geometric, full-text, range types | PostGIS, pg_trgm |
| **GIN** | Generalized inverted | Arrays, JSONB, full-text | JSONB queries, text search |
| **BRIN** | Block range | Large sequential/time-series data | Timestamp columns, IoT |
| **Bitmap** | Bit arrays | Low-cardinality columns | Gender, status, boolean |

### B-Tree Index (Most Common)

```
B-Tree for indexed column "age":

                    [30]
                   /    \
              [15,25]    [40,50]
             / |  \     / |  \
          [10][20][28] [35][45][60]
          
  Query: WHERE age = 28
  → Root: 28 < 30 → go left
  → Node: 25 < 28 → go right
  → Leaf: Found 28! → pointer to row on disk

  Query: WHERE age BETWEEN 20 AND 35
  → Find 20 (leaf) → scan right through 25, 28, 30, 35 → stop
  → Range queries are efficient because leaves are linked

  Properties:
  • Balanced: All leaves at same depth → consistent O(log N) lookup
  • Sorted: Supports ORDER BY, range queries, MIN/MAX
  • Node size = disk page (4-16 KB) → minimal disk I/O
```

### Composite (Multi-Column) Index

```
CREATE INDEX idx_user_search ON users (country, city, age);

  Leftmost prefix rule — the index works for:
  ✓ WHERE country = 'US'
  ✓ WHERE country = 'US' AND city = 'NYC'
  ✓ WHERE country = 'US' AND city = 'NYC' AND age > 25
  
  ✗ WHERE city = 'NYC' (skips leftmost column — can't use index)
  ✗ WHERE age > 25 (skips first two columns)

  Column order matters!
  Think of it as a phone book: sorted by Last Name, then First Name.
  You can look up "Smith" but not "John" without knowing the last name.
```

### Covering Index

```
A covering index includes ALL columns needed by a query:

  CREATE INDEX idx_covering ON orders (user_id) INCLUDE (total, status);
  
  SELECT total, status FROM orders WHERE user_id = 123;
  → Index contains user_id, total, status
  → No need to read the actual table row ("index-only scan")
  → Much faster (avoids random I/O to heap)
```

### Index Trade-offs

```
PROS:
  ✓ Dramatically faster reads (O(log N) vs O(N))
  ✓ Enables efficient sorting (ORDER BY uses index)
  ✓ Enables efficient joins (index nested-loop join)

CONS:
  ✗ Slower writes (must update index on INSERT/UPDATE/DELETE)
  ✗ Extra storage (index can be 10-30% of table size)
  ✗ Maintenance overhead (reindex, bloat)
  ✗ Too many indexes → write-heavy workloads suffer

Rule of thumb:
  Read-heavy (90% reads): Index generously
  Write-heavy (90% writes): Index sparingly, only what's needed
  Balance: Index columns used in WHERE, JOIN, ORDER BY
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows indexes speed up reads; can create basic index |
| **Mid** | Knows B-tree vs hash; composite index order; trade-offs |
| **Senior** | Covering indexes, partial indexes, EXPLAIN analysis, index bloat |
| **Staff+** | Index design for specific query patterns; LSM trees; distributed indexes |

### Red Flags

- Not indexing columns used in WHERE clauses
- Not knowing that indexes slow down writes
- Not understanding composite index column order
- Adding indexes on every column (over-indexing)

### Common Questions

1. What is a database index? How does it work?
2. When should you NOT use an index?
3. What is a composite index? Does column order matter?
4. How does a B-tree index work?
5. What is a covering index?
6. How do you analyze query performance?

---

## C. Practical Engineering View

### EXPLAIN Analysis

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

WITHOUT index:
  Seq Scan on users  (rows=10000000)
  Filter: (email = 'alice@example.com')
  Execution Time: 8500.123 ms

WITH index:
  Index Scan using idx_users_email on users  (rows=1)
  Index Cond: (email = 'alice@example.com')
  Execution Time: 0.045 ms

Key things to look for in EXPLAIN:
  • Seq Scan → missing index (for selective queries)
  • Index Scan → good, using index
  • Index Only Scan → best, covering index
  • Bitmap Index Scan → OK, index + heap access
  • Sort → check if index can eliminate the sort
  • Rows estimate → if way off, ANALYZE the table
```

### Partial Index

```sql
-- Only index active users (80% of queries are for active users)
CREATE INDEX idx_active_users ON users (email) WHERE status = 'active';

-- Smaller index (only active rows), faster to scan, less storage
-- Query must include WHERE status = 'active' to use this index

-- Other examples:
CREATE INDEX idx_unpaid ON invoices (due_date) WHERE paid = false;
CREATE INDEX idx_recent ON events (created_at) WHERE created_at > '2024-01-01';
```

### Index Monitoring

```
Key metrics:
  • Index hit rate: pg_stat_user_indexes → idx_scan (should be high)
  • Unused indexes: idx_scan = 0 for weeks → drop them (save write overhead)
  • Index size: pg_relation_size() → growing too fast?
  • Index bloat: Dead tuples in index → REINDEX periodically
  • Seq scans on large tables: pg_stat_user_tables → seq_scan count

PostgreSQL query:
  SELECT indexrelname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;
```

---

## D. Example: E-Commerce Query Optimization

```
Table: orders (50M rows)

Frequent queries:
  1. SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  2. SELECT * FROM orders WHERE status = 'pending' AND created_at < now() - interval '24h'
  3. SELECT count(*), sum(total) FROM orders WHERE user_id = ? AND status = 'completed'

Indexes:
  1. CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);
     → Composite: finds user's orders already sorted by date (index scan + no sort)

  2. CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';
     → Partial: only indexes pending orders (much smaller than full index)

  3. CREATE INDEX idx_orders_user_status ON orders (user_id, status) INCLUDE (total);
     → Covering: includes total column → index-only scan (no heap access)

Before: Query 1 takes 500ms (seq scan + sort)
After: Query 1 takes 2ms (index scan, pre-sorted)
```

---

## E. HLD and LLD

### E.1 HLD — Search Architecture with Indexes

```
┌──────────────────────────────────────────────────┐
│  Application                                      │
│      │                                            │
│  ┌───┴──────────────────────────┐                │
│  │  Query Router                │                │
│  │  Analyzes query → picks index│                │
│  └───┬──────────────────────────┘                │
│      │                                            │
│  ┌───┴──────────────────────────────────────┐    │
│  │  PostgreSQL                               │    │
│  │                                            │    │
│  │  Table: orders (50M rows, 20 GB)          │    │
│  │                                            │    │
│  │  Indexes:                                  │    │
│  │    idx_orders_pkey (B-tree, id)     1.2 GB│    │
│  │    idx_orders_user (B-tree, user_id) 800 MB│   │
│  │    idx_orders_email (Hash, email)    600 MB│   │
│  │    idx_orders_date (BRIN, created_at) 10 MB│   │
│  │    idx_orders_search (GIN, JSONB)    2 GB │    │
│  │                                            │    │
│  │  Total index size: 4.6 GB (23% of table)  │    │
│  └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### E.2 LLD — Index Advisor

```python
class IndexAdvisor:
    """Analyzes slow queries and recommends indexes"""
    
    def __init__(self, db_conn):
        self.db = db_conn

    def analyze_query(self, query: str) -> dict:
        """Run EXPLAIN ANALYZE and return recommendations"""
        plan = self.db.execute(f"EXPLAIN (ANALYZE, FORMAT JSON) {query}")
        
        recommendations = []
        total_cost = plan[0]["Plan"]["Total Cost"]
        node_type = plan[0]["Plan"]["Node Type"]
        
        if node_type == "Seq Scan" and total_cost > 1000:
            table = plan[0]["Plan"]["Relation Name"]
            filter_col = self._extract_filter_columns(plan)
            recommendations.append({
                "type": "CREATE_INDEX",
                "table": table,
                "columns": filter_col,
                "reason": f"Seq scan with cost {total_cost}; index would reduce to ~10",
            })
        
        if "Sort" in str(plan) and "Sort Key" in str(plan):
            sort_cols = self._extract_sort_columns(plan)
            recommendations.append({
                "type": "ADD_TO_INDEX",
                "columns": sort_cols,
                "reason": "Sort operation could be eliminated with index",
            })

        return {
            "current_cost": total_cost,
            "scan_type": node_type,
            "recommendations": recommendations,
        }

    def find_unused_indexes(self, min_age_days=30):
        """Find indexes that haven't been used"""
        query = """
            SELECT indexrelname, idx_scan, pg_relation_size(indexrelid) as size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND schemaname = 'public'
            ORDER BY pg_relation_size(indexrelid) DESC
        """
        return self.db.execute(query)
```

---

## F. Summary & Practice

### Key Takeaways

1. **Indexes** trade write speed and storage for dramatically faster reads
2. **B-tree** is the default; supports equality, range, sorting
3. **Composite index** column order matters — follows leftmost prefix rule
4. **Covering index** includes all query columns — enables index-only scans
5. **Partial index** only indexes a subset of rows — smaller and faster
6. Use **EXPLAIN ANALYZE** to verify index usage
7. Monitor for **unused indexes** (waste write overhead) and **missing indexes** (slow queries)
8. Rule: index columns in **WHERE, JOIN ON, ORDER BY**
9. Over-indexing hurts write performance; under-indexing hurts read performance

### Interview Questions

1. What is a database index? How does it work?
2. How does a B-tree index work?
3. What is a composite index? Does column order matter?
4. What is a covering index?
5. When should you NOT add an index?
6. How do you identify missing indexes?
7. What is a partial index?
8. How do indexes affect write performance?

### Practice Exercises

1. **Exercise 1**: Given a table with 100M rows and 5 frequent query patterns, design the optimal set of indexes. Justify each one.
2. **Exercise 2**: Your database has 30 indexes on a write-heavy table. Queries are fast but writes are slow. Identify which indexes to drop.
3. **Exercise 3**: Use EXPLAIN ANALYZE to optimize a slow query. Show before/after plans and the index you created.

---

> **Previous**: [30 — Consensus Algorithms](30-consensus-algorithms.md)
> **Next**: [32 — Full-Text Search](32-full-text-search.md)
