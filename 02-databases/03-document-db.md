# Topic 03: Document Database

> **Track**: Databases and Storage
> **Difficulty**: Intermediate
> **Prerequisites**: SQL vs NoSQL, Key-Value Store

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

### What is a Document Database?

A **document database** stores data as semi-structured documents (JSON, BSON, XML). Each document is self-contained, can have a different structure, and is identified by a unique key. Unlike key-value stores, document DBs allow querying and indexing on fields **within** the document.

```
SQL table:
  users: id | name | email | address_street | address_city | address_zip

Document DB:
  {
    "_id": "user_123",
    "name": "Alice",
    "email": "alice@example.com",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "zip": "94102"
    },
    "tags": ["premium", "early_adopter"],
    "orders": [
      {"id": "ord_1", "total": 99.99, "status": "delivered"},
      {"id": "ord_2", "total": 49.50, "status": "pending"}
    ]
  }

  Key difference from key-value:
    Key-value: GET by key only, value is opaque blob
    Document:  GET by key + query on ANY field inside the document
      db.users.find({"address.city": "San Francisco", "tags": "premium"})
```

### Document DB Landscape

| Database | Format | Transactions | Scaling | Best For |
|----------|--------|-------------|---------|----------|
| **MongoDB** | BSON (Binary JSON) | Multi-doc ACID (4.0+) | Sharding + replicas | General purpose |
| **CouchDB** | JSON | Per-doc | Master-master replication | Offline-first, sync |
| **Amazon DocumentDB** | JSON (MongoDB-compatible) | Single-doc | Managed, replicas | AWS-native MongoDB |
| **Firestore** | JSON | Multi-doc | Managed, serverless | Mobile/web apps |
| **Cosmos DB** | JSON | Multi-doc | Global distribution | Multi-model, Azure |
| **Couchbase** | JSON | Multi-doc | Sharding + replicas | Caching + document |

### Embedding vs Referencing

```
EMBEDDING (denormalization):
  Store related data inside the same document.

  {
    "_id": "user_123",
    "name": "Alice",
    "orders": [
      {"id": "ord_1", "total": 99.99, "items": [...]},
      {"id": "ord_2", "total": 49.50, "items": [...]}
    ]
  }

  Pros: Single read fetches everything, no joins needed
  Cons: Document grows large, data duplication, 16 MB limit (MongoDB)

  Use when:
  ✓ Data is read together (user + their orders on a profile page)
  ✓ Relationship is 1:few (user has a few addresses)
  ✓ Embedded data doesn't change independently

REFERENCING (normalization):
  Store a reference (ID) and look up separately.

  // Users collection
  {"_id": "user_123", "name": "Alice"}

  // Orders collection
  {"_id": "ord_1", "user_id": "user_123", "total": 99.99}
  {"_id": "ord_2", "user_id": "user_123", "total": 49.50}

  Pros: No duplication, documents stay small, independent updates
  Cons: Requires multiple queries or application-level joins

  Use when:
  ✓ Data is accessed independently (orders queried without user)
  ✓ Relationship is 1:many or many:many
  ✓ Referenced data changes frequently
```

### Schema Design Patterns

```
1. ATTRIBUTE PATTERN: Variable attributes as key-value pairs
   { "specs": [ {"k": "color", "v": "red"}, {"k": "size", "v": "XL"} ] }
   Index on specs.k + specs.v for efficient queries

2. BUCKET PATTERN: Group time-series data into buckets
   { "sensor_id": "s1", "date": "2024-01-15",
     "readings": [ {"time": "10:00", "temp": 22.5}, ... ] }
   One document per sensor per day (not per reading)

3. OUTLIER PATTERN: Handle documents that exceed normal size
   { "_id": "popular_post", "comments_count": 50000,
     "comments": [...first 100...], "has_overflow": true }
   Overflow comments in a separate collection

4. COMPUTED PATTERN: Pre-compute aggregations
   { "product_id": "p1", "total_reviews": 4532, "avg_rating": 4.2 }
   Update on each review instead of recalculating every read

5. POLYMORPHIC PATTERN: Different shapes in same collection
   {"type": "book", "title": "...", "isbn": "..."}
   {"type": "movie", "title": "...", "director": "..."}
   Query: db.media.find({"type": "book"})
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows MongoDB stores JSON; flexible schema |
| **Mid** | Embedding vs referencing; when to choose document DB over SQL |
| **Senior** | Schema design patterns; sharding key selection; aggregation pipeline |
| **Staff+** | Multi-document transactions trade-offs; migration strategies; MongoDB internals |

### Red Flags

- Using a document DB when strong joins and referential integrity are needed
- Embedding everything (documents grow too large)
- Not creating indexes (full collection scans)
- Treating MongoDB as a "schema-less" excuse for no data modeling

### Common Questions

1. When would you use a document DB over SQL?
2. Explain embedding vs referencing in MongoDB.
3. How does MongoDB sharding work?
4. Does MongoDB support transactions?
5. How would you model [X] in a document database?

---

## C. Practical Engineering View

### MongoDB Indexing

```
Without index: Full collection scan (every document checked)
With index: B-tree lookup, orders of magnitude faster

  // Single field index
  db.users.createIndex({"email": 1})

  // Compound index (order matters — leftmost prefix rule)
  db.orders.createIndex({"user_id": 1, "created_at": -1})

  // Text index (full-text search)
  db.products.createIndex({"name": "text", "description": "text"})

  // TTL index (auto-delete after N seconds)
  db.sessions.createIndex({"created_at": 1}, {expireAfterSeconds: 3600})

  // Partial index (only index matching documents)
  db.orders.createIndex(
    {"created_at": 1},
    {partialFilterExpression: {"status": "pending"}}
  )

  Use explain() to verify:
  db.users.find({"email": "alice@example.com"}).explain("executionStats")
```

### MongoDB Sharding

```mermaid
flowchart TB
    N0["mongos Router: directs queries to correct shard<br/>(router)"]
    N1["Shard A Shard B Shard C<br/>user_id user_id user_id<br/>A-H I-P Q-Z<br/>(replica (replica (replica<br/>set) set) set)"]
    N2["Shard key: Determines data distribution"]
    N3["Good shard keys:<br/>✓ High cardinality (many unique values)<br/>✓ Even distribution (no hot shards)<br/>✓ Matches query patterns (queries target 1 shard)"]
    N4["Bad shard keys:<br/>✗ Low cardinality (status: &quot;active&quot;/&quot;inactive&quot;)<br/>✗ Monotonically increasing (timestamps -&gt; all writes to last shard)<br/>✗ Not in query patterns (queries scatter to all shards)"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
```

### MongoDB vs PostgreSQL Decision

```
Choose MongoDB when:
  ✓ Schema varies per record (product catalogs with different attributes)
  ✓ Rapid prototyping (schema evolves weekly)
  ✓ Hierarchical data (nested objects/arrays are natural)
  ✓ Horizontal scaling is planned from day one
  ✓ Access patterns are known and simple (by user_id, by product_id)

Choose PostgreSQL when:
  ✓ Complex joins across many entities
  ✓ Financial transactions (strong ACID)
  ✓ Reporting with complex aggregations
  ✓ Referential integrity is critical
  ✓ PostgreSQL JSONB covers your flexibility needs

Note: PostgreSQL JSONB gives you ~80% of MongoDB's flexibility
  with full SQL power. Often the best of both worlds.
```

---

## D. Example: Product Catalog

```
E-commerce product catalog with varying attributes per category:

  // Electronics
  {
    "_id": "prod_001",
    "name": "MacBook Pro 16",
    "category": "electronics",
    "price": 2499.00,
    "brand": "Apple",
    "specs": {
      "screen_size": 16.2,
      "processor": "M3 Pro",
      "ram_gb": 18,
      "storage_gb": 512
    },
    "variants": [
      {"sku": "MBP16-M3P-18-512", "color": "Space Black", "stock": 42},
      {"sku": "MBP16-M3P-18-1T", "color": "Silver", "stock": 15}
    ],
    "images": ["img1.jpg", "img2.jpg"],
    "rating": {"avg": 4.7, "count": 1832}
  }

  // Clothing (different attributes!)
  {
    "_id": "prod_002",
    "name": "Running Jacket",
    "category": "clothing",
    "price": 89.99,
    "brand": "Nike",
    "specs": {
      "material": "Polyester",
      "waterproof": true,
      "weight_grams": 350
    },
    "variants": [
      {"sku": "RJ-S-BLK", "size": "S", "color": "Black", "stock": 100},
      {"sku": "RJ-M-BLK", "size": "M", "color": "Black", "stock": 75}
    ],
    "images": ["img3.jpg"],
    "rating": {"avg": 4.3, "count": 567}
  }

  In SQL: Would need a generic EAV (entity-attribute-value) table or
          dozens of category-specific tables. Document DB is natural.

  Indexes:
    db.products.createIndex({"category": 1, "price": 1})
    db.products.createIndex({"brand": 1})
    db.products.createIndex({"name": "text", "brand": "text"})
    db.products.createIndex({"variants.sku": 1})
```

---

## E. HLD and LLD

### E.1 HLD — Document DB Product Service

```mermaid
flowchart TB
    N0["Clients"]
    N1["API Gateway"]
    N2["Product Service"]
    N3["MongoDB Cluster (Sharded)"]
    N4["Shard Key: category + product_id (hashed)"]
    N5["Shard 1 Shard 2 Shard 3<br/>Primary Primary Primary<br/>+2 Replicas +2 Replicas +2 Replicas"]
    N6["Cache: Redis (popular products, 5 min TTL)<br/>Search: Elasticsearch (synced via Change Streams)"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
```

### E.2 LLD — Document Repository

```java
// Dependencies in the original example:
// from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT

public class ProductRepository {
    private Object db;
    private Object collection;

    public ProductRepository(Object mongoClient, String dbName) {
        this.db = mongoClient[dbName];
        this.collection = this.db.get("products");
        // _ensure_indexes()
    }

    public Object ensureIndexes() {
        // collection.create_index([("category", ASCENDING), ("price", ASCENDING)])
        // collection.create_index([("brand", ASCENDING)])
        // collection.create_index([("variants.sku", ASCENDING)], unique=true)
        // collection.create_index([("name", TEXT), ("brand", TEXT)])
        return null;
    }

    public Map<String, Object> getById(String productId) {
        // return collection.find_one({"_id": product_id})
        return null;
    }

    public Map<String, Object> getBySku(String sku) {
        // return collection.find_one({"variants.sku": sku})
        return null;
    }

    public Map<String, Object> search(String query, String category, double minPrice, double maxPrice, int page, int size) {
        // filters = {}
        // if query
        // filters["$text"] = {"$search": query}
        // if category
        // filters["category"] = category
        // if min_price is not null or max_price is not null
        // price_filter = {}
        // if min_price is not null
        // ...
        return null;
    }

    public boolean updateStock(String sku, int quantityChange) {
        // result = collection.update_one(
        // {"variants.sku": sku, "variants.stock": {"$gte": -quantity_change}},
        // {"$inc": {"variants.$.stock": quantity_change}}
        // )
        // return result.modified_count > 0
        return false;
    }

    public Object updateRating(String productId, double newRating) {
        // Atomic update of computed rating fields
        // product = get_by_id(product_id)
        // if not product
        // return
        // current = product.get("rating", {"avg": 0, "count": 0})
        // new_count = current["count"] + 1
        // new_avg = ((current["avg"] * current["count"]) + new_rating) / new_count
        // collection.update_one(
        // ...
        return null;
    }
}
```

---

## F. Summary & Practice

### Key Takeaways

1. **Document DBs** store JSON-like documents; query on any field inside
2. **Embedding** = store related data together (fast reads, single query)
3. **Referencing** = store IDs, look up separately (no duplication, smaller docs)
4. **MongoDB** supports multi-document ACID transactions (since 4.0)
5. **Schema design patterns**: attribute, bucket, outlier, computed, polymorphic
6. **Sharding** by high-cardinality, evenly-distributed key matching query patterns
7. **Indexes** are critical — use `explain()` to verify; TTL indexes for auto-expire
8. Best for: product catalogs, CMS, user profiles, varying schemas per record
9. **PostgreSQL JSONB** gives 80% of document DB flexibility with SQL power
10. "Schema-less" doesn't mean "no data modeling" — design documents for access patterns

### Interview Questions

1. When would you choose a document DB over SQL?
2. Explain embedding vs referencing. When would you use each?
3. How does MongoDB sharding work? How do you choose a shard key?
4. Does MongoDB support ACID transactions?
5. How would you model a product catalog with varying attributes?
6. Compare MongoDB with PostgreSQL JSONB.

### Practice Exercises

1. **Exercise 1**: Design the MongoDB schema for a blog platform (users, posts, comments, tags). Decide what to embed vs reference. Justify.
2. **Exercise 2**: Your MongoDB collection has 100M documents and queries are slow. Design the indexing strategy given 5 common query patterns.
3. **Exercise 3**: Migrate an e-commerce product catalog from a SQL EAV (entity-attribute-value) schema to MongoDB. Show before and after data models.

---

> **Previous**: [02 — Key-Value Store](02-key-value-store.md)
> **Next**: [04 — Columnar DB](04-columnar-db.md)
