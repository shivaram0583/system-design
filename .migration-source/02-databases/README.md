# Databases and Storage

> Choosing the right database is one of the most impactful decisions in system design. This section covers database types, scaling strategies, and operational patterns.

## Topics

| # | Topic | Key Question |
|---|-------|-------------|
| 01 | [SQL vs NoSQL](01-sql-vs-nosql.md) | Structured or flexible? |
| 02 | [Key-Value Store](02-key-value-store.md) | Simple lookups at massive scale? |
| 03 | [Document DB](03-document-db.md) | Flexible schemas with rich queries? |
| 04 | [Columnar DB](04-columnar-db.md) | Analytics on huge datasets? |
| 05 | [Graph DB](05-graph-db.md) | Highly connected data? |
| 06 | [Time-Series DB](06-time-series-db.md) | Metrics and events over time? |
| 07 | [Read Replicas](07-read-replicas.md) | Scale reads without hurting writes? |
| 08 | [Write Scaling](08-write-scaling.md) | Handle massive write throughput? |
| 09 | [Schema Design](09-schema-design.md) | Model data for your access patterns? |
| 10 | [Indexing Strategy](10-indexing-strategy.md) | Make queries fast? |
| 11 | [Query Optimization](11-query-optimization.md) | Efficient data retrieval? |
| 12 | [Data Archival](12-data-archival.md) | Manage growing data over time? |
| 13 | [Backup & Recovery](13-backup-recovery.md) | Survive data loss? |

## Quick Decision Matrix

| Need | Best Fit | Examples |
|------|----------|----------|
| Transactions, joins, structured data | SQL (RDBMS) | PostgreSQL, MySQL |
| Flexible schema, documents | Document DB | MongoDB, CouchDB |
| Simple key-value lookups | Key-Value Store | Redis, DynamoDB |
| Analytics, columnar scans | Columnar DB | Cassandra, ClickHouse |
| Relationships, graph traversal | Graph DB | Neo4j, Amazon Neptune |
| Time-stamped metrics/events | Time-Series DB | InfluxDB, TimescaleDB |
| Full-text search | Search Engine | Elasticsearch, Solr |
| File/blob storage | Object Store | S3, GCS, Azure Blob |
