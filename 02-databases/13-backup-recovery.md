# Topic 13: Backup & Recovery

> **Track**: Databases and Storage
> **Difficulty**: Intermediate → Advanced
> **Prerequisites**: Replication, Data Archival, Read Replicas

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

### Why Backup & Recovery?

Disasters happen: hardware failure, accidental deletion, ransomware, software bugs corrupting data, human error (`DROP TABLE` in production). Without backups, data loss is permanent. Backup & recovery is your **last line of defense**.

```
"Everyone has a backup strategy. Almost nobody has a tested restore strategy."

  Data loss scenarios:
  • Hardware failure (disk dies)
  • Human error (DELETE without WHERE clause)
  • Software bug (corrupts data silently for days)
  • Security breach (ransomware encrypts your DB)
  • Natural disaster (data center fire, flood)
  • Cloud provider outage (region goes down)

  Replication is NOT a backup:
  • If you DROP TABLE, replicas drop it too (instantly replicated)
  • If data is corrupted, corruption replicates to all replicas
  • Replicas protect against hardware failure, not logical errors
```

### Key Metrics

```
RPO (Recovery Point Objective):
  Maximum acceptable data loss measured in time.
  "How much data can we afford to lose?"
  
  RPO = 1 hour → backups every hour → lose at most 1 hour of data
  RPO = 0 → synchronous replication → no data loss (expensive)

RTO (Recovery Time Objective):
  Maximum acceptable downtime.
  "How long can we be down?"
  
  RTO = 4 hours → must restore and be operational within 4 hours
  RTO = 0 → hot standby, automatic failover (expensive)

  ┌──────────────────────────────────────────────┐
  │  Cost vs. RPO/RTO                             │
  │                                                │
  │  RPO=24h, RTO=8h   → nightly backup to S3    │
  │                       Cost: $                  │
  │                                                │
  │  RPO=1h, RTO=1h    → hourly backups + replica │
  │                       Cost: $$                 │
  │                                                │
  │  RPO=1min, RTO=5min → WAL archiving + hot     │
  │                       standby + auto-failover  │
  │                       Cost: $$$                │
  │                                                │
  │  RPO=0, RTO=0      → synchronous multi-region │
  │                       replication              │
  │                       Cost: $$$$               │
  └──────────────────────────────────────────────┘
```

### Backup Types

```
1. FULL BACKUP:
   Complete copy of the entire database.
   
   Pros: Self-contained, simplest restore
   Cons: Slowest, largest storage, heaviest DB load
   Frequency: Weekly or daily for small DBs
   
2. INCREMENTAL BACKUP:
   Only data that changed since the LAST backup (any type).
   
   Restore: Full + all incrementals in sequence
   Pros: Fast backup, small size
   Cons: Complex restore (chain of incrementals)

3. DIFFERENTIAL BACKUP:
   Only data that changed since the LAST FULL backup.
   
   Restore: Full + latest differential
   Pros: Simpler restore than incremental
   Cons: Grows larger over time until next full backup

4. WAL / TRANSACTION LOG ARCHIVING (PostgreSQL):
   Continuously ship WAL (Write-Ahead Log) segments to archive.
   
   Restore: Full backup + replay WAL up to any point in time.
   This enables POINT-IN-TIME RECOVERY (PITR).
   
   RPO: Seconds to minutes (depends on WAL archive frequency)
   
   PostgreSQL: archive_mode = on, archive_command = 'copy to S3'
   MySQL: binlog shipping
```

### Point-in-Time Recovery (PITR)

```
Scenario: At 3:00 PM, someone runs DELETE FROM orders (no WHERE clause).
  All 10M orders deleted. Replicas replicate the delete.

Without PITR:
  Restore last night's full backup → lose everything since midnight.
  13 hours of data lost!

With PITR:
  1. Restore last full backup (midnight)
  2. Replay WAL logs from midnight to 2:59:59 PM
  3. Stop before the DELETE statement
  4. Result: Recover to exactly 1 second before the disaster

  Timeline:
  [Full backup 00:00] ──WAL──WAL──WAL── [Disaster 15:00]
                                         ↑
                         Recover to 14:59:59

  PostgreSQL PITR:
    recovery_target_time = '2024-01-15 14:59:59'

  AWS RDS: Automated backups + PITR with 1-second granularity
    "Restore to any point in the last 35 days"
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows backups are important; mentions daily backups |
| **Mid** | Understands RPO/RTO; knows full vs incremental; PITR |
| **Senior** | Designs backup strategy for specific RPO/RTO; handles multi-region |
| **Staff+** | Backup verification, disaster recovery drills, compliance, cost optimization |

### Red Flags

- "Replicas are our backup" (replicas replicate deletes too!)
- No mention of RPO/RTO when discussing backup strategy
- Never testing restore procedures
- Not encrypting backups

### Common Questions

1. What is the difference between RPO and RTO?
2. How does PITR work?
3. Why isn't replication a substitute for backups?
4. How would you design a backup strategy for [system X]?
5. How do you verify backups actually work?

---

## C. Practical Engineering View

### AWS RDS Backup Strategy

```
Automated backups (built-in):
  • Automated daily snapshots (full backup)
  • Transaction log backups every 5 minutes
  • PITR: restore to any second in last 35 days
  • Retention: 1-35 days (configurable)
  • Stored in S3 (managed by AWS)
  • Cost: Free storage up to DB size; then $0.095/GB/month

Manual snapshots:
  • On-demand full backup (before deployments, migrations)
  • Retained until explicitly deleted
  • Can copy cross-region for disaster recovery

Cross-region backup:
  • Enable cross-region automated backups
  • Or copy snapshots to another region
  • Enables recovery even if entire region goes down

RDS restore:
  • Restores to a NEW instance (not in-place)
  • Takes 10-60 minutes depending on size
  • Update DNS/connection strings to point to new instance
```

### Backup Verification

```
UNTESTED BACKUPS ARE NOT BACKUPS.

Backup verification strategy:
  1. AUTOMATED RESTORE TEST (weekly):
     • Restore latest backup to a test instance
     • Run integrity checks (checksums, row counts)
     • Run a set of smoke queries
     • Compare with production (sample data)
     • Tear down test instance
     
  2. FULL DISASTER RECOVERY DRILL (quarterly):
     • Simulate production failure
     • Restore from backup in a different region
     • Verify application works end-to-end
     • Measure actual RTO (vs target RTO)
     • Document findings, fix gaps

  3. MONITORING:
     • Alert if backup job fails
     • Alert if backup size is unexpectedly small (partial backup?)
     • Alert if backup age exceeds RPO
     • Track backup duration trends (growing = scaling issue)

  Schedule automated restore tests:
    Every Sunday 2 AM:
    1. Restore latest RDS snapshot to test instance
    2. Run: SELECT count(*) from orders → compare with production
    3. Run: smoke test queries
    4. If any check fails → PagerDuty alert
    5. Delete test instance
```

### Backup Encryption and Security

```
Backups contain ALL your data — they're a prime target.

  Requirements:
  • Encrypt backups at rest (AES-256)
  • Encrypt in transit (TLS)
  • Restrict access (IAM policies, separate AWS account)
  • Separate backup storage from production account
  • Immutable backups (Object Lock in S3 — ransomware protection)

  S3 Object Lock (WORM — Write Once Read Many):
    Put backup in S3 with Object Lock retention = 30 days
    Even root account cannot delete within retention period
    Protects against: ransomware, malicious admin, accidental deletion

  AWS Backup Vault Lock:
    Same concept for AWS managed backups
    Once locked, even AWS support cannot delete
```

### Multi-Database Backup Coordination

```
Challenge: Microservices with 10 databases.
  If each DB backs up independently, they're at different points in time.
  Restoring all to "consistent state" is hard.

  Strategies:
  1. EVENT-SOURCED: Replay events from Kafka to rebuild any DB state
     Store Kafka topics with retention = 30 days
     Rebuild any service's state by replaying events

  2. COORDINATED SNAPSHOTS:
     Use distributed snapshot (Kafka offsets as coordination point)
     Each DB backs up at the same logical point

  3. PER-SERVICE BACKUP + EVENT REPLAY:
     Each service backs up its own DB independently
     On restore: restore DB + replay events from last backup timestamp

  4. ACCEPT EVENTUAL CONSISTENCY:
     Restore each DB to its latest backup independently
     Accept that cross-service data may be slightly inconsistent
     Let reconciliation jobs fix inconsistencies
```

---

## D. Example: E-Commerce Backup Strategy

```
Requirements:
  RPO: 5 minutes (lose at most 5 min of orders)
  RTO: 30 minutes (be operational within 30 min)
  Retention: 35 days online, 7 years archived
  Compliance: PCI-DSS (encrypted, access-controlled)

  ┌────────────────────────────────────────────────────┐
  │  PRIMARY: PostgreSQL on RDS (us-east-1)            │
  │                                                      │
  │  Automated backups:                                 │
  │  • Daily snapshot at 2 AM (full backup)             │
  │  • WAL archiving every 5 minutes                    │
  │  • PITR: any point in last 35 days                  │
  │  • Encrypted: AES-256 (KMS managed key)            │
  │                                                      │
  │  Cross-region:                                      │
  │  • Daily snapshot replicated to eu-west-1            │
  │  • Enables DR in case of us-east-1 failure          │
  │                                                      │
  │  Long-term:                                         │
  │  • Monthly snapshots copied to S3 Glacier           │
  │  • Retained for 7 years (SOX compliance)            │
  │  • S3 Object Lock (immutable)                       │
  │                                                      │
  │  Verification:                                      │
  │  • Weekly automated restore test                    │
  │  • Quarterly DR drill (restore in eu-west-1)        │
  │  • Alert if backup age > 6 hours                    │
  │                                                      │
  │  Recovery procedure:                                │
  │  1. Detect failure (automated health checks)        │
  │  2. Initiate PITR to latest available point         │
  │  3. New RDS instance spins up (~15 min)             │
  │  4. Update Route53 DNS to new instance              │
  │  5. Verify application connectivity                 │
  │  6. Total RTO: ~25 minutes ✓                        │
  └────────────────────────────────────────────────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Backup & Recovery Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Production (us-east-1)                                    │
│  ┌──────────────┐     ┌──────────────┐                   │
│  │  Primary DB  │────►│  Read Replica │ (HA)             │
│  │  (RDS)       │     └──────────────┘                   │
│  └──────┬───────┘                                         │
│         │                                                  │
│  ┌──────┴────────────────────────────────────┐           │
│  │  AWS Backup                                │           │
│  │  • Daily snapshots                         │           │
│  │  • WAL every 5 min                         │           │
│  │  • PITR (35 days)                          │           │
│  │  • Encrypted (KMS)                         │           │
│  └──────┬────────────────────────────────────┘           │
│         │ cross-region copy                               │
│  ┌──────┴────────────────────────────────────┐           │
│  │  DR Region (eu-west-1)                     │           │
│  │  • Daily snapshot copy                     │           │
│  │  • Can restore new RDS instance            │           │
│  └───────────────────────────────────────────┘           │
│                                                            │
│  ┌────────────────────────────────────────────┐          │
│  │  Long-Term Archive (S3)                    │          │
│  │  • Monthly snapshots → S3 Glacier          │          │
│  │  • 7-year retention                        │          │
│  │  • Object Lock (immutable)                 │          │
│  └────────────────────────────────────────────┘          │
│                                                            │
│  ┌────────────────────────────────────────────┐          │
│  │  Verification                              │          │
│  │  • Weekly restore test (automated)         │          │
│  │  • Quarterly DR drill (manual)             │          │
│  │  • Alert: backup age, size, failures       │          │
│  └────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Backup Verification Service

```python
import datetime

class BackupVerificationService:
    """Automated backup verification — runs weekly"""
    
    def __init__(self, rds_client, s3_client, db_connector,
                 alert_service, config):
        self.rds = rds_client
        self.s3 = s3_client
        self.db_connector = db_connector
        self.alert = alert_service
        self.config = config

    def verify_latest_backup(self) -> dict:
        report = {"timestamp": datetime.datetime.utcnow().isoformat()}
        
        try:
            # 1. Check backup exists and is recent
            backup = self._get_latest_backup()
            report["backup_id"] = backup["id"]
            report["backup_age_hours"] = backup["age_hours"]
            
            if backup["age_hours"] > self.config["max_backup_age_hours"]:
                self.alert.critical(
                    f"Backup too old: {backup['age_hours']}h "
                    f"(max: {self.config['max_backup_age_hours']}h)"
                )
                report["status"] = "FAIL_AGE"
                return report

            # 2. Restore to test instance
            test_instance = self._restore_to_test(backup["id"])
            report["test_instance"] = test_instance["id"]

            # 3. Run integrity checks
            checks = self._run_integrity_checks(test_instance)
            report["integrity_checks"] = checks

            if not all(c["passed"] for c in checks):
                failed = [c for c in checks if not c["passed"]]
                self.alert.critical(
                    f"Backup integrity check failed: {failed}"
                )
                report["status"] = "FAIL_INTEGRITY"
            else:
                report["status"] = "PASS"

            # 4. Cleanup test instance
            self._cleanup_test_instance(test_instance["id"])

        except Exception as e:
            report["status"] = "FAIL_ERROR"
            report["error"] = str(e)
            self.alert.critical(f"Backup verification failed: {e}")

        return report

    def _get_latest_backup(self) -> dict:
        snapshots = self.rds.describe_db_snapshots(
            DBInstanceIdentifier=self.config["db_instance_id"],
            SnapshotType="automated"
        )["DBSnapshots"]
        
        latest = sorted(snapshots, key=lambda s: s["SnapshotCreateTime"])[-1]
        age = (datetime.datetime.utcnow().replace(tzinfo=None) -
               latest["SnapshotCreateTime"].replace(tzinfo=None))
        
        return {
            "id": latest["DBSnapshotIdentifier"],
            "age_hours": age.total_seconds() / 3600,
            "size_gb": latest.get("AllocatedStorage"),
        }

    def _restore_to_test(self, snapshot_id: str) -> dict:
        test_id = f"backup-verify-{datetime.date.today().isoformat()}"
        self.rds.restore_db_instance_from_db_snapshot(
            DBInstanceIdentifier=test_id,
            DBSnapshotIdentifier=snapshot_id,
            DBInstanceClass="db.t3.medium",
            Tags=[{"Key": "purpose", "Value": "backup-verification"}]
        )
        # Wait for instance to be available
        waiter = self.rds.get_waiter('db_instance_available')
        waiter.wait(DBInstanceIdentifier=test_id)
        return {"id": test_id}

    def _run_integrity_checks(self, test_instance: dict) -> list:
        conn = self.db_connector.connect(test_instance["id"])
        checks = []

        # Check 1: Key table row counts
        for table in self.config["verify_tables"]:
            prod_count = self._get_production_count(table)
            test_count = conn.execute(f"SELECT count(*) FROM {table}")[0][0]
            deviation = abs(prod_count - test_count) / max(prod_count, 1)
            checks.append({
                "check": f"row_count_{table}",
                "prod": prod_count,
                "backup": test_count,
                "deviation": round(deviation, 4),
                "passed": deviation < 0.01,  # <1% deviation acceptable
            })

        # Check 2: Sample data integrity
        for table in self.config["verify_tables"]:
            sample = conn.execute(
                f"SELECT * FROM {table} ORDER BY random() LIMIT 10"
            )
            checks.append({
                "check": f"sample_data_{table}",
                "rows_returned": len(sample),
                "passed": len(sample) > 0,
            })

        conn.close()
        return checks

    def _cleanup_test_instance(self, instance_id: str):
        self.rds.delete_db_instance(
            DBInstanceIdentifier=instance_id,
            SkipFinalSnapshot=True
        )

    def _get_production_count(self, table: str) -> int:
        conn = self.db_connector.connect(self.config["db_instance_id"])
        count = conn.execute(f"SELECT count(*) FROM {table}")[0][0]
        conn.close()
        return count
```

---

## F. Summary & Practice

### Key Takeaways

1. **Replication ≠ backup**: replicas replicate deletes and corruption too
2. **RPO** = max data loss (time); **RTO** = max downtime (time)
3. **Full + WAL archiving** enables **Point-in-Time Recovery** (PITR) to any second
4. **PITR** is the gold standard: restore to 1 second before disaster
5. **Test your backups**: untested backups are not backups — automate weekly restore tests
6. **Encrypt backups**: AES-256 at rest, TLS in transit, restrict IAM access
7. **S3 Object Lock**: immutable backups, protection against ransomware
8. **Cross-region backups** for disaster recovery (entire region failure)
9. **Long-term retention**: monthly snapshots to Glacier for compliance (7 years)
10. Define RPO/RTO first, then design the backup strategy to meet them

### Interview Questions

1. What is RPO and RTO? How do they influence backup design?
2. Why isn't replication a substitute for backups?
3. How does Point-in-Time Recovery work?
4. How do you verify that backups work?
5. Design a backup strategy for a financial application with RPO=1min, RTO=15min.
6. How do you protect backups from ransomware?
7. How do you coordinate backups across multiple microservice databases?

### Practice Exercises

1. **Exercise 1**: Design the complete backup & recovery strategy for a healthcare platform (HIPAA compliant). Include: RPO/RTO, backup types, encryption, cross-region DR, retention, and verification.
2. **Exercise 2**: At 3 PM, an engineer accidentally runs `DELETE FROM users` on production. All 5M users are deleted. Replicas also deleted. Walk through the recovery process step by step.
3. **Exercise 3**: Your company has 20 microservices, each with its own database. Design the backup coordination strategy that enables consistent cross-service recovery.

---

> **Previous**: [12 — Data Archival](12-data-archival.md)
> **Index**: [Databases README](README.md)
