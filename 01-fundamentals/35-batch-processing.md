# Topic 35: Batch Processing

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–34 (especially Stream Processing)

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

### What is Batch Processing?

**Batch processing** operates on a large, bounded dataset all at once, typically on a schedule. It processes data that has already been collected, producing results after the entire dataset is processed.

```
Stream: Process each event as it arrives (real-time)
Batch:  Collect data → Process all at once → Output results

Examples:
  • Daily sales report: Process all transactions from yesterday
  • ML model training: Train on all historical data
  • ETL pipeline: Extract from DB → Transform → Load into data warehouse
  • Billing: Calculate all user invoices at end of month
  • Search index rebuild: Re-index all documents nightly
```

### MapReduce Paradigm

```
The foundational batch processing model (Google, 2004):

INPUT DATA (distributed across nodes):
  File 1: "the cat sat on the mat"
  File 2: "the dog sat on the log"

MAP phase (parallel, per-record):
  File 1 → ("the",1), ("cat",1), ("sat",1), ("on",1), ("the",1), ("mat",1)
  File 2 → ("the",1), ("dog",1), ("sat",1), ("on",1), ("the",1), ("log",1)

SHUFFLE (group by key):
  "the"  → [1, 1, 1, 1]
  "cat"  → [1]
  "sat"  → [1, 1]
  "on"   → [1, 1]
  ...

REDUCE phase (aggregate per key):
  "the"  → 4
  "cat"  → 1
  "sat"  → 2
  "on"   → 2

OUTPUT: Word counts across all files
```

### Batch Processing Frameworks

| Framework | Language | Speed | Best For |
|-----------|---------|-------|----------|
| **Apache Spark** | Java/Scala/Python/R | Fast (in-memory) | General-purpose batch + ML |
| **Apache Hadoop (MapReduce)** | Java | Slow (disk-based) | Legacy, very large datasets |
| **Apache Hive** | SQL | Moderate | SQL on Hadoop/data lake |
| **dbt** | SQL | Fast | Data warehouse transformations |
| **Apache Airflow** | Python (orchestrator) | N/A (orchestrates) | Workflow scheduling |
| **AWS Glue** | Python/Spark | Fast | Managed ETL on AWS |
| **Presto/Trino** | SQL | Fast | Interactive queries on data lake |

### ETL vs ELT

```
ETL (Extract, Transform, Load):
  Source DB → Extract → Transform (clean, aggregate) → Load into warehouse
  Transform happens BEFORE loading.
  Traditional approach. Good when warehouse storage is expensive.

ELT (Extract, Load, Transform):
  Source DB → Extract → Load raw into warehouse → Transform in warehouse
  Transform happens AFTER loading using warehouse compute (e.g., dbt + BigQuery).
  Modern approach. Warehouse handles transformation at scale.

  ┌────────┐     ┌───────────┐     ┌───────────┐
  │ Source │────►│ Raw Layer │────►│ Transform │──► Curated tables
  │  DBs   │ EL  │(data lake)│ T   │(Spark/dbt)│
  └────────┘     └───────────┘     └───────────┘
```

### Lambda vs Kappa Architecture

```
LAMBDA (batch + stream):
  ┌──────────────────────┐
  │ Raw Data             │
  │    │         │       │
  │    ▼         ▼       │
  │ [Batch]  [Stream]   │
  │ (Spark)  (Flink)    │
  │    │         │       │
  │    ▼         ▼       │
  │ [Serving Layer]      │  Merge batch + stream results
  └──────────────────────┘
  Pros: Accurate (batch) + real-time (stream)
  Cons: Two codebases to maintain

KAPPA (stream only):
  ┌──────────────────────┐
  │ Raw Data             │
  │    │                 │
  │    ▼                 │
  │ [Stream only]        │
  │ (Flink/Kafka)        │
  │    │                 │
  │    ▼                 │
  │ [Serving Layer]      │  Replay Kafka for historical reprocessing
  └──────────────────────┘
  Pros: Single codebase, simpler
  Cons: Replay can be slow for large datasets
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows batch = scheduled, large-scale data processing |
| **Mid** | Knows Spark; can design basic ETL pipeline |
| **Senior** | Lambda/Kappa architecture; data lake design; partitioning strategy |
| **Staff+** | Cost optimization, data quality, exactly-once ETL, schema evolution |

### Red Flags

- Using batch where real-time is needed
- Not considering idempotency in batch jobs (re-running produces duplicates)
- No monitoring or alerting for batch job failures

### Common Questions

1. What is batch processing? When would you use it?
2. Compare batch vs stream processing.
3. What is ETL? Compare ETL vs ELT.
4. Explain MapReduce.
5. What is the Lambda architecture?
6. How do you handle batch job failures?

---

## C. Practical Engineering View

### Idempotent Batch Jobs

```
Problem: Batch job fails halfway → re-run → duplicate data!

Solutions:
  1. OVERWRITE: Write entire partition, don't append
     INSERT OVERWRITE INTO sales_daily PARTITION (date='2024-01-15')
     Re-run replaces the partition entirely.

  2. UPSERT: Use merge/upsert instead of insert
     MERGE INTO target USING source ON target.id = source.id
     WHEN MATCHED THEN UPDATE
     WHEN NOT MATCHED THEN INSERT

  3. STAGING TABLE: Write to temp → swap atomically
     Write results to sales_daily_staging
     If successful: RENAME sales_daily_staging → sales_daily
     If failed: DROP sales_daily_staging (no partial data)
```

### Workflow Orchestration (Airflow)

```python
# Airflow DAG for daily ETL
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

dag = DAG(
    "daily_sales_etl",
    schedule_interval="0 2 * * *",  # 2 AM daily
    start_date=datetime(2024, 1, 1),
    catchup=True,  # Backfill missed runs
    default_args={
        "retries": 3,
        "retry_delay": timedelta(minutes=5),
    },
)

extract = PythonOperator(task_id="extract", python_callable=extract_from_db, dag=dag)
transform = PythonOperator(task_id="transform", python_callable=transform_data, dag=dag)
load = PythonOperator(task_id="load", python_callable=load_to_warehouse, dag=dag)
validate = PythonOperator(task_id="validate", python_callable=run_data_quality, dag=dag)

extract >> transform >> load >> validate
```

### Monitoring Batch Jobs

```
Key metrics:
  • Job duration (trending up = investigate)
  • Data volume processed (sudden drop = data source issue)
  • Record count (input vs output — mismatch = bug)
  • Error rate (failed records / total records)
  • SLA compliance (finished before deadline?)
  • Resource usage (CPU, memory, disk I/O)

Alerts:
  Job failed → P2 alert → on-call investigates
  Job > 2× normal duration → Warning
  Output records < 80% of expected → Data quality alert
  Job didn't start on schedule → Scheduler issue
```

---

## D. Example: Daily Analytics Pipeline

```
Daily pipeline: Raw events → Aggregated metrics → Dashboard

  Schedule: 2:00 AM UTC daily (processes previous day)
  
  ┌────────────┐     ┌────────────┐     ┌────────────────┐
  │ S3 Raw     │────►│ Spark Job  │────►│ Data Warehouse │
  │ Events     │     │ (EMR)      │     │ (Redshift)     │
  │ (Parquet)  │     │            │     │                │
  └────────────┘     │ Extract:   │     │ Tables:        │
                     │  S3 parquet│     │  daily_metrics │
  10 TB / day        │ Transform: │     │  user_cohorts  │
                     │  aggregate │     │  revenue_summary│
                     │  join      │     └────────────────┘
                     │  clean     │            │
                     │ Load:      │     ┌──────┴──────┐
                     │  Redshift  │     │  Looker     │
                     └────────────┘     │  Dashboard  │
                                        └─────────────┘

  Processing time: ~45 minutes for 10 TB
  Cost: ~$15/run (spot instances)
  SLA: Results available by 3:00 AM UTC
```

---

## E. HLD and LLD

### E.1 HLD — Data Pipeline Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Data Sources                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐                              │
│  │App DB│ │Kafka │ │APIs  │                              │
│  └──┬───┘ └──┬───┘ └──┬───┘                              │
│     └────────┼────────┘                                   │
│              ▼                                             │
│  ┌────────────────────────┐                               │
│  │  Data Lake (S3)         │                               │
│  │  /raw/     (source data)│                               │
│  │  /staging/ (transformed)│                               │
│  │  /curated/ (final)      │                               │
│  └──────────┬─────────────┘                               │
│             │                                              │
│  ┌──────────┴─────────────┐                               │
│  │  Spark on EMR / Glue   │                               │
│  │  Orchestrated by Airflow│                               │
│  │  Scheduled: daily 2 AM │                               │
│  └──────────┬─────────────┘                               │
│             │                                              │
│  ┌──────────┴─────────────┐                               │
│  │  Data Warehouse         │                               │
│  │  (Redshift / BigQuery)  │                               │
│  │  + BI tools (Looker)    │                               │
│  └─────────────────────────┘                               │
│                                                            │
│  Monitoring: Airflow UI + CloudWatch + PagerDuty          │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Batch Job Framework

```python
class BatchJob:
    """Base class for idempotent batch jobs"""
    
    def __init__(self, job_name: str, execution_date: str):
        self.job_name = job_name
        self.execution_date = execution_date
        self.metrics = {"input_count": 0, "output_count": 0, "error_count": 0}

    def run(self):
        try:
            log.info(f"Starting {self.job_name} for {self.execution_date}")
            
            # Extract
            raw_data = self.extract()
            self.metrics["input_count"] = len(raw_data)
            
            # Transform
            transformed = self.transform(raw_data)
            
            # Validate
            self.validate(transformed)
            
            # Load (idempotent: overwrite partition)
            self.load(transformed)
            self.metrics["output_count"] = len(transformed)
            
            self.report_metrics()
            log.info(f"Completed {self.job_name}: {self.metrics}")
            
        except Exception as e:
            self.metrics["error_count"] += 1
            log.error(f"Failed {self.job_name}: {e}")
            alert(f"Batch job {self.job_name} failed: {e}")
            raise

    def extract(self) -> list:
        raise NotImplementedError

    def transform(self, data: list) -> list:
        raise NotImplementedError

    def validate(self, data: list):
        """Data quality checks"""
        if len(data) == 0:
            raise ValueError("Transform produced zero records")
        # Add more checks: null rates, schema validation, etc.

    def load(self, data: list):
        raise NotImplementedError

    def report_metrics(self):
        monitoring.emit(f"batch.{self.job_name}.input_count", self.metrics["input_count"])
        monitoring.emit(f"batch.{self.job_name}.output_count", self.metrics["output_count"])


class DailySalesAggregation(BatchJob):
    def extract(self):
        return spark.read.parquet(f"s3://raw/sales/{self.execution_date}/")

    def transform(self, data):
        return data.groupBy("product_id", "region") \
                    .agg(sum("amount").alias("total_sales"),
                         count("*").alias("transaction_count"))

    def load(self, data):
        data.write.mode("overwrite") \
            .partitionBy("region") \
            .parquet(f"s3://curated/daily_sales/{self.execution_date}/")
```

---

## F. Summary & Practice

### Key Takeaways

1. **Batch processing** operates on bounded datasets on a schedule (hourly/daily)
2. **MapReduce** = Map (parallel transform) → Shuffle (group) → Reduce (aggregate)
3. **Spark** is the modern standard; Hadoop MapReduce is legacy
4. **ETL** transforms before loading; **ELT** loads raw then transforms in warehouse
5. **Lambda architecture**: batch + stream layers; **Kappa**: stream-only with replay
6. **Idempotent jobs**: overwrite partitions, use upsert, or staging tables
7. **Airflow** for orchestration; schedule, retry, dependency management
8. Monitor: job duration, record counts, data quality, SLA compliance
9. Batch is best for **reports, ML training, ETL, billing, re-indexing**

### Interview Questions

1. What is batch processing? When would you use it vs stream?
2. Explain MapReduce with an example.
3. What is ETL? Compare ETL vs ELT.
4. How do you make batch jobs idempotent?
5. What is the Lambda architecture? Compare with Kappa.
6. How do you handle batch job failures?
7. Design a daily analytics pipeline.

### Practice Exercises

1. **Exercise 1**: Design a daily ETL pipeline for an e-commerce platform: extract from 5 source databases, transform into a star schema, load into a data warehouse.
2. **Exercise 2**: Your nightly batch job takes 6 hours but the SLA is 4 hours. Diagnose and optimize.
3. **Exercise 3**: Design a batch + stream architecture (Lambda) for a real-time dashboard that also needs historical accuracy.

---

> **Previous**: [34 — Stream Processing](34-stream-processing.md)
> **Next**: [36 — Observability](36-observability.md)
