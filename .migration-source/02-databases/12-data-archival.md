# Topic 12: Data Archival

> **Track**: Databases and Storage
> **Difficulty**: Intermediate
> **Prerequisites**: Schema Design, Partitioning, Blob Storage

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

### What is Data Archival?

**Data archival** is the process of moving old, infrequently accessed data from the primary database to cheaper, long-term storage. This keeps the primary database small, fast, and cost-effective while preserving data for compliance, auditing, or historical analysis.

```
Without archival:
  Year 1: 10M rows → fast queries
  Year 3: 300M rows → queries slow down, storage expensive
  Year 5: 1B rows → indexes huge, backups take hours, migrations painful

With archival:
  Primary DB: only last 90 days (~30M rows) → always fast
  Archive: older data in S3/Glacier → cheap, queryable when needed
  
  Result: Primary DB stays the same size regardless of business growth.
```

### Data Lifecycle

```
┌────────────────────────────────────────────────────┐
│  HOT DATA (0-30 days)                              │
│  Primary database (PostgreSQL/MySQL)                │
│  Fast SSD storage, full indexes                    │
│  Cost: $$$                                          │
├────────────────────────────────────────────────────┤
│  WARM DATA (30-90 days)                            │
│  Read replica or separate DB instance               │
│  Accessed occasionally (reports, lookups)           │
│  Cost: $$                                           │
├────────────────────────────────────────────────────┤
│  COLD DATA (90 days - 7 years)                     │
│  Object storage (S3 Standard-IA)                    │
│  Rarely accessed, queryable via Athena/Presto      │
│  Cost: $                                            │
├────────────────────────────────────────────────────┤
│  FROZEN DATA (7+ years / compliance)               │
│  Deep archive (S3 Glacier Deep Archive)            │
│  Accessed only for legal/audit                     │
│  Retrieval: hours                                   │
│  Cost: ¢                                            │
└────────────────────────────────────────────────────┘

Cost comparison (per TB/month):
  PostgreSQL RDS (gp3): ~$115/TB
  S3 Standard:          ~$23/TB    (5× cheaper)
  S3 Standard-IA:       ~$12.50/TB (9× cheaper)
  S3 Glacier:           ~$4/TB     (29× cheaper)
  S3 Glacier Deep:      ~$1/TB     (115× cheaper)
```

### Archival Strategies

```
1. TIME-BASED ARCHIVAL:
   Move data older than N days to archive.
   Most common and simplest approach.
   
   Archive rule: Move orders older than 90 days to S3.
   Schedule: Run nightly at 2 AM.

2. STATUS-BASED ARCHIVAL:
   Move data that has reached a terminal state.
   
   Archive rule: Move orders with status = 'completed' or 'cancelled'
   that are older than 30 days.
   Active orders stay in primary regardless of age.

3. SIZE-BASED ARCHIVAL:
   Trigger archival when table exceeds a threshold.
   
   Archive rule: When orders table exceeds 50M rows,
   archive the oldest 10M rows.

4. TIERED ARCHIVAL:
   Move through tiers: hot → warm → cold → frozen.
   
   0-30d:  Primary DB (hot)
   30-90d: Move to separate "archive" DB (warm)
   90d-2y: Export to S3 Parquet (cold)
   2y+:    Move to Glacier (frozen)
```

### Archive Formats

```
PARQUET (recommended for analytics):
  Columnar format, compressed, schema-embedded
  Queryable with Athena, Spark, Presto
  Excellent compression (5-10× vs CSV)
  Supports predicate pushdown (skip irrelevant data)

CSV/JSON (simple but inefficient):
  Human-readable, easy to produce
  Large files, no schema enforcement
  No compression by default

AVRO (good for streaming/schema evolution):
  Row-based, schema embedded
  Good for Kafka consumers writing to archive
  Schema evolution support

ORC (Hive ecosystem):
  Columnar, similar to Parquet
  Better for Hive queries

Recommendation: Use PARQUET for most archival use cases.
  Partition by date: s3://archive/orders/year=2024/month=01/data.parquet
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows old data should be moved out of production DB |
| **Mid** | Can describe archival strategy, knows S3 storage classes |
| **Senior** | Designs full data lifecycle, handles compliance, queryable archives |
| **Staff+** | Cost modeling, cross-region archival, data retention policies at scale |

### Red Flags

- No plan for data growth ("we'll just add more storage")
- Not considering compliance requirements (GDPR, SOX, HIPAA)
- Archiving without ability to query archived data
- No testing of archive restoration

### Common Questions

1. How do you handle data growth in a production database?
2. What is data archival? What strategies exist?
3. How do you query archived data?
4. How do you handle compliance requirements (data retention)?
5. Design the data lifecycle for an e-commerce platform.

---

## C. Practical Engineering View

### PostgreSQL Partitioning for Archival

```sql
-- Partition by month: easy to archive and drop old data

CREATE TABLE orders (
    id UUID,
    user_id UUID,
    total DECIMAL(10,2),
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Archive: Export old partition to S3
-- pg_dump or COPY TO for the specific partition
COPY orders_2023_01 TO '/tmp/orders_2023_01.csv' WITH CSV HEADER;
-- Upload to S3, convert to Parquet

-- Then detach and drop:
ALTER TABLE orders DETACH PARTITION orders_2023_01;
DROP TABLE orders_2023_01;
-- Instant! No vacuum, no dead tuples, no lock contention.
```

### Querying Archived Data

```
AWS Athena (serverless SQL on S3):

  -- Point Athena at S3 archive location
  CREATE EXTERNAL TABLE archived_orders (
    id STRING, user_id STRING, total DOUBLE, status STRING
  )
  PARTITIONED BY (year INT, month INT)
  STORED AS PARQUET
  LOCATION 's3://myapp-archive/orders/';

  -- Query archived data with standard SQL
  SELECT user_id, sum(total) AS total_spent
  FROM archived_orders
  WHERE year = 2023 AND month = 6
  GROUP BY user_id;

  -- Cost: $5 per TB scanned
  -- Parquet + partitioning → only scan relevant data → very cheap

  -- Combine hot + cold data:
  SELECT * FROM orders WHERE created_at > '2024-01-01'
  UNION ALL
  SELECT * FROM archived_orders WHERE year = 2023 AND month = 12;
```

### GDPR and Compliance

```
GDPR Right to Erasure: User requests data deletion.
  Challenge: Data is archived in S3 (immutable files).

  Solutions:
  1. SOFT DELETE + CRYPTO SHREDDING:
     Encrypt each user's archived data with a per-user key.
     To "delete": destroy the user's encryption key.
     Data becomes unreadable (effectively deleted).

  2. TOMBSTONE FILE:
     Maintain a list of deleted user IDs.
     When querying archive, filter out tombstoned users.
     Periodically rewrite archive files without deleted users.

  3. PARTITION BY USER SEGMENT:
     Group users by ID range in archive files.
     Rewrite only affected files on deletion request.

  Data retention policies:
    Financial records: 7 years (SOX compliance)
    Healthcare records: 6-10 years (HIPAA)
    General user data: Delete when user requests (GDPR)
    Logs: 90 days - 1 year (operational need)
```

---

## D. Example: E-Commerce Order Archival

```
Platform: 10M orders/month, 3 years of data = 360M rows

  Current: All in PostgreSQL → 500 GB, queries slowing down
  Goal: Primary DB stays under 50M rows (5 months)

  ┌────────────────────────────────────────────────────┐
  │  ARCHIVAL PIPELINE (runs nightly)                   │
  │                                                      │
  │  1. IDENTIFY: SELECT * FROM orders                  │
  │     WHERE created_at < now() - interval '5 months'  │
  │     AND status IN ('completed', 'cancelled')        │
  │                                                      │
  │  2. EXPORT: Write to S3 as Parquet, partitioned     │
  │     s3://archive/orders/year=2024/month=01/*.parquet│
  │                                                      │
  │  3. VERIFY: Count rows in S3 = count in DB          │
  │     Checksum validation                              │
  │                                                      │
  │  4. DELETE: Remove archived rows from PostgreSQL     │
  │     DELETE FROM orders WHERE id IN (archived_ids)   │
  │     Or: DETACH + DROP partition (if partitioned)     │
  │                                                      │
  │  5. VACUUM: Reclaim space in PostgreSQL              │
  └────────────────────────────────────────────────────┘

  Results:
    PostgreSQL: 50M rows (50 GB) → fast queries ✓
    S3 Archive: 310M rows (30 GB Parquet, compressed) → cheap ✓
    Queryable: AWS Athena for historical reports ✓
    Savings: $300/month RDS storage → $1/month S3 ✓
```

---

## E. HLD and LLD

### E.1 HLD — Data Archival Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Primary Database (PostgreSQL)                             │
│  Hot data: last 5 months                                  │
│      │                                                     │
│  ┌───┴────────────────┐                                   │
│  │ Archival Service    │ Runs nightly via Airflow          │
│  │ • Identify old data │                                   │
│  │ • Export to Parquet │                                   │
│  │ • Verify integrity  │                                   │
│  │ • Delete from DB    │                                   │
│  └───┬────────────────┘                                   │
│      │                                                     │
│  ┌───┴────────────────┐                                   │
│  │ S3 (Archive)       │                                   │
│  │ /orders/year=YYYY/month=MM/*.parquet                   │
│  │                     │                                   │
│  │ Lifecycle rules:    │                                   │
│  │ 0-1 yr: Standard-IA │                                  │
│  │ 1-7 yr: Glacier     │                                  │
│  │ 7+ yr:  Deep Archive│                                  │
│  └───┬────────────────┘                                   │
│      │                                                     │
│  ┌───┴────────────────┐                                   │
│  │ Query Layer        │                                   │
│  │ Athena / Presto    │ SQL on archived data              │
│  │ API: GET /orders?  │ Routes to DB or Athena            │
│  │   date<5mo → DB    │ based on date range               │
│  │   date>5mo → Athena│                                   │
│  └────────────────────┘                                   │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Archival Service

```python
import json
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime, timedelta

class ArchivalService:
    """Archives old data from PostgreSQL to S3 as Parquet"""
    
    def __init__(self, db_pool, s3_client, bucket: str,
                 retention_days: int = 150):
        self.db = db_pool
        self.s3 = s3_client
        self.bucket = bucket
        self.retention_days = retention_days

    def run_archival(self, table: str, date_column: str,
                    batch_size: int = 50000):
        cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
        print(f"Archiving {table} data before {cutoff.isoformat()}")

        total_archived = 0
        while True:
            # 1. Fetch batch of old rows
            rows = self.db.execute(f"""
                SELECT * FROM {table}
                WHERE {date_column} < %s
                ORDER BY {date_column}
                LIMIT %s
            """, (cutoff, batch_size))

            if not rows:
                break

            # 2. Determine partition (year/month)
            partition_key = rows[0][date_column].strftime("%Y/%m")

            # 3. Convert to Parquet
            table_data = pa.Table.from_pylist([dict(r) for r in rows])
            buffer = pa.BufferOutputStream()
            pq.write_table(table_data, buffer, compression='snappy')

            # 4. Upload to S3
            s3_key = f"archive/{table}/year={partition_key[:4]}/month={partition_key[5:]}/{datetime.utcnow().isoformat()}.parquet"
            self.s3.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=buffer.getvalue().to_pybytes()
            )

            # 5. Verify upload
            s3_obj = self.s3.head_object(Bucket=self.bucket, Key=s3_key)
            if s3_obj['ContentLength'] == 0:
                raise RuntimeError(f"Upload verification failed for {s3_key}")

            # 6. Delete archived rows from primary DB
            ids = [r['id'] for r in rows]
            placeholders = ", ".join(["%s"] * len(ids))
            self.db.execute(
                f"DELETE FROM {table} WHERE id IN ({placeholders})", ids
            )
            self.db.commit()

            total_archived += len(rows)
            print(f"  Archived {len(rows)} rows to {s3_key}")

        print(f"Archival complete: {total_archived} rows archived from {table}")
        return total_archived

    def query_archive(self, table: str, year: int, month: int,
                     sql_filter: str = None) -> list:
        """Query archived data via S3 Select or Athena"""
        prefix = f"archive/{table}/year={year}/month={month:02d}/"
        
        # List all Parquet files in the partition
        response = self.s3.list_objects_v2(
            Bucket=self.bucket, Prefix=prefix
        )
        
        results = []
        for obj in response.get('Contents', []):
            # Read Parquet from S3
            s3_obj = self.s3.get_object(Bucket=self.bucket, Key=obj['Key'])
            table_data = pq.read_table(pa.BufferReader(s3_obj['Body'].read()))
            df = table_data.to_pandas()
            
            if sql_filter:
                df = df.query(sql_filter)
            results.extend(df.to_dict('records'))
        
        return results
```

---

## F. Summary & Practice

### Key Takeaways

1. **Data archival** moves old data from expensive primary DB to cheap storage
2. **Data lifecycle**: hot (DB) → warm (replica) → cold (S3-IA) → frozen (Glacier)
3. **Time-based archival** is the most common strategy (archive data older than N days)
4. **Parquet** format for archives: columnar, compressed, queryable
5. **Partitioned tables** make archival easy: detach partition → export → drop
6. **AWS Athena** provides SQL-on-S3 for querying archived data ($5/TB scanned)
7. **Verify before deleting**: always confirm archive integrity before removing from DB
8. **GDPR crypto shredding**: encrypt per-user, destroy key to "delete"
9. **S3 lifecycle rules** automate tier transitions (Standard → IA → Glacier)
10. Cost savings: 10-100× cheaper storage with preserved queryability

### Interview Questions

1. How do you handle data growth in a production database?
2. What is data archival? What strategies exist?
3. How do you query archived data?
4. How do you handle GDPR right to erasure for archived data?
5. Design the data lifecycle for a financial application.

### Practice Exercises

1. **Exercise 1**: Design the archival strategy for a SaaS platform with 500M events/month. Include: retention tiers, archive format, query access, and cost estimate.
2. **Exercise 2**: Your PostgreSQL database has 2 TB of data and queries are slow. Design a migration plan to archive 80% to S3 while maintaining query access.
3. **Exercise 3**: A user invokes their GDPR right to erasure. Their data exists in: PostgreSQL, Redis cache, S3 archives (Parquet), Elasticsearch, and Kafka. Design the deletion workflow.

---

> **Previous**: [11 — Query Optimization](11-query-optimization.md)
> **Next**: [13 — Backup & Recovery](13-backup-recovery.md)
