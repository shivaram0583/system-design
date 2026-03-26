# Topic 09: Schema Design

> **Track**: Databases and Storage
> **Difficulty**: Intermediate → Advanced
> **Prerequisites**: SQL vs NoSQL, Document DB, Columnar DB

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

### What is Schema Design?

**Schema design** is the process of defining how data is organized, related, and stored in a database. A well-designed schema makes common queries fast, keeps data consistent, and adapts to growth. A poorly designed schema causes slow queries, data anomalies, and painful migrations.

```
Schema design is driven by TWO forces:

  1. DATA MODEL: What entities exist? How are they related?
     Users, Orders, Products, Reviews → relationships

  2. ACCESS PATTERNS: What queries will you run?
     "Get all orders for user X" → design for this query

  SQL: Design data model first, optimize for access patterns second
  NoSQL: Design for access patterns first, data model adapts
```

### Normalization (SQL)

```
Normalization reduces data redundancy by splitting data into related tables.

UNNORMALIZED (all in one table):
  orders: order_id | user_name | user_email | product_name | product_price | qty
  
  Problems:
  • User name repeated in every order (100 orders = 100 copies)
  • Update user email → must update ALL order rows
  • Delete last order → lose user data (deletion anomaly)

1NF (First Normal Form): Atomic values, no repeating groups
  Each column has a single value, each row is unique

2NF: No partial dependencies
  All non-key columns depend on the ENTIRE primary key

3NF (Third Normal Form): No transitive dependencies
  Non-key columns depend ONLY on the primary key, not on other non-key columns

  NORMALIZED (3NF):
  users:    user_id | name     | email
  products: prod_id | name     | price
  orders:   order_id| user_id  | prod_id | qty | order_date

  Each fact stored ONCE. JOINs reconstruct the full picture.
  
  Pros: No data duplication, easy updates, data integrity
  Cons: More JOINs, slower reads for complex queries
```

### Denormalization

```
Intentionally adding redundancy to speed up reads.

  NORMALIZED:
  SELECT u.name, o.total, p.name
  FROM orders o
  JOIN users u ON o.user_id = u.id
  JOIN products p ON o.product_id = p.id
  → 2 JOINs per query

  DENORMALIZED:
  orders: order_id | user_id | user_name | product_name | total | order_date
  
  SELECT user_name, total, product_name FROM orders WHERE user_id = 123
  → 0 JOINs, much faster

  When to denormalize:
  ✓ Read-heavy workloads (100:1 read/write ratio)
  ✓ Performance-critical queries
  ✓ Data that rarely changes (user name changes infrequently)
  ✓ Reporting/analytics tables (materialized views)

  Risks:
  • Data inconsistency (user renames → must update all denormalized copies)
  • Storage increase
  • More complex write logic
```

### Access Pattern-Driven Design (NoSQL)

```
NoSQL: Start with queries, design schema to serve them.

  Access patterns for a chat app:
  1. Get messages for chat X, sorted by time (most recent first)
  2. Get all chats for user Y
  3. Get unread count for user Y

  DynamoDB design:
  
  Table: Messages
  PK: chat_id       SK: timestamp#message_id
  ┌───────────┬──────────────────────┬─────────┬─────────┐
  │ chat_id   │ SK                   │ sender  │ content │
  │ chat_123  │ 2024-01-15T10:00#m1 │ alice   │ hello   │
  │ chat_123  │ 2024-01-15T10:01#m2 │ bob     │ hi      │
  └───────────┴──────────────────────┴─────────┴─────────┘

  GSI (Global Secondary Index) for pattern 2:
  GSI-PK: user_id    GSI-SK: last_message_time
  → Get all chats for a user, sorted by most recent

  Pattern 3: Store unread_count as an attribute on the chat item
  Increment atomically on new message, reset on read
```

### Common Schema Patterns

```
1. SINGLE TABLE DESIGN (DynamoDB):
   All entities in ONE table, differentiated by PK/SK pattern
   
   PK: USER#123     SK: PROFILE       → user profile
   PK: USER#123     SK: ORDER#001     → user's order
   PK: USER#123     SK: ORDER#002     → another order
   PK: ORDER#001    SK: ITEM#1        → order line item

2. ADJACENCY LIST (for hierarchies):
   PK: parent_id    SK: child_id
   Enables: get all children of a parent, get parent of a child

3. MATERIALIZED AGGREGATES:
   Store pre-computed counts/sums as attributes
   { product_id: "p1", review_count: 4532, avg_rating: 4.2 }
   Update atomically on each new review

4. TIME-SERIES PARTITION:
   PK: sensor_id#2024-01-15   SK: timestamp
   One partition per sensor per day (prevents hot partitions)

5. SPARSE INDEX:
   Only some items have the GSI key → index is small
   GSI on "is_featured" → only featured products indexed
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Understands tables, primary keys, foreign keys, basic normalization |
| **Mid** | Can normalize to 3NF; knows when to denormalize; designs DynamoDB keys |
| **Senior** | Single table design; access pattern analysis; migration strategies |
| **Staff+** | Multi-model design; schema evolution at scale; backward compatibility |

### Red Flags

- Designing schema without knowing access patterns
- Over-normalizing (10 JOINs per query)
- Under-normalizing (massive data duplication with no update strategy)
- Using auto-increment IDs as DynamoDB partition keys (hot partition)

### Common Questions

1. How would you design the schema for [system X]?
2. What is normalization? When would you denormalize?
3. How do you design a DynamoDB table for these access patterns?
4. What is single table design?
5. How do you handle schema migrations in production?

---

## C. Practical Engineering View

### Schema Migrations

```
Schema changes in production — must be backward compatible!

  SAFE migrations (no downtime):
  ✓ Add a new column (with default or nullable)
  ✓ Add a new index (CREATE INDEX CONCURRENTLY in PostgreSQL)
  ✓ Add a new table
  ✓ Rename a column (add new, copy data, update code, drop old)

  UNSAFE migrations (can cause downtime):
  ✗ Drop a column (old code may reference it)
  ✗ Change column type (may fail for existing data)
  ✗ Add NOT NULL without default (fails if rows exist)
  ✗ Rename a column directly (old code breaks)

  Safe rename pattern (expand-contract):
    Step 1: Add new column (name_new)
    Step 2: Backfill: UPDATE users SET name_new = name
    Step 3: Deploy code that writes to BOTH columns
    Step 4: Deploy code that reads from new column
    Step 5: Drop old column

  Tools: Flyway, Liquibase, Alembic (Python), Django migrations
  Large tables: Use gh-ost (GitHub) or pt-online-schema-change (Percona)
```

### PostgreSQL JSONB for Flexibility

```sql
-- Semi-structured data within a relational schema
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb,  -- Flexible attributes
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Electronics: {"screen_size": 16.2, "ram_gb": 18, "processor": "M3"}
-- Clothing:    {"material": "cotton", "size": "M", "color": "blue"}

-- GIN index for fast JSONB queries
CREATE INDEX idx_product_attrs ON products USING GIN (attributes);

-- Query: products with ram_gb > 16
SELECT * FROM products
WHERE attributes->>'ram_gb'::int > 16;

-- Query: products with color = 'blue'
SELECT * FROM products
WHERE attributes @> '{"color": "blue"}'::jsonb;

-- Best of both worlds: structured columns for common fields
-- + JSONB for variable attributes per category
```

---

## D. Example: E-Commerce Schema

```sql
-- Normalized relational schema for e-commerce

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Products (with JSONB for variable attributes)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    price DECIMAL(10,2) NOT NULL,
    attributes JSONB DEFAULT '{}',
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders (denormalized user_name for fast display)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);

-- Order Items (junction table)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,  -- Snapshot of price at order time
    UNIQUE(order_id, product_id)
);

-- Reviews (with materialized aggregates on products)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES users(id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, user_id)
);

-- Key design decisions:
-- 1. unit_price on order_items: snapshot price (product price may change)
-- 2. shipping_address as JSONB: flexible address formats per country
-- 3. attributes as JSONB: different per product category
-- 4. Index on orders(user_id, created_at DESC): fast "my orders" query
```

---

## E. HLD and LLD

### E.1 HLD — Schema Design Process

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: IDENTIFY ENTITIES                                 │
│  Users, Products, Orders, Reviews, Categories             │
│                                                            │
│  Step 2: DEFINE RELATIONSHIPS                             │
│  User 1:N Orders, Order N:M Products, Product 1:N Reviews │
│                                                            │
│  Step 3: LIST ACCESS PATTERNS                             │
│  • Get user profile by ID                                 │
│  • Get orders for user (sorted by date)                   │
│  • Get products by category (with filters)                │
│  • Get reviews for product (sorted by date)               │
│  • Search products by name                                │
│  • Get order with all items and product details           │
│                                                            │
│  Step 4: CHOOSE DATABASE                                  │
│  SQL (PostgreSQL): Transactions, JOINs, structured data   │
│  + JSONB for flexible attributes                          │
│                                                            │
│  Step 5: NORMALIZE (3NF baseline)                         │
│  Separate tables for each entity                          │
│                                                            │
│  Step 6: DENORMALIZE FOR PERFORMANCE                      │
│  • unit_price snapshot on order_items                     │
│  • avg_rating on products (materialized)                  │
│  • user_name on orders (for listing without JOIN)         │
│                                                            │
│  Step 7: ADD INDEXES                                      │
│  Based on access patterns (WHERE, ORDER BY, JOIN columns) │
│                                                            │
│  Step 8: PLAN MIGRATIONS                                  │
│  Schema changes must be backward-compatible               │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Schema Migration Manager

```python
import hashlib
import datetime

class SchemaMigration:
    def __init__(self, version: str, description: str, up_sql: str, down_sql: str):
        self.version = version
        self.description = description
        self.up_sql = up_sql
        self.down_sql = down_sql
        self.checksum = hashlib.md5(up_sql.encode()).hexdigest()


class MigrationRunner:
    """Applies schema migrations in order with tracking"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self._ensure_migration_table()

    def _ensure_migration_table(self):
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                description TEXT,
                checksum TEXT,
                applied_at TIMESTAMPTZ DEFAULT now()
            )
        """)
        self.db.commit()

    def get_applied_versions(self) -> set:
        rows = self.db.execute(
            "SELECT version FROM schema_migrations ORDER BY version"
        )
        return {row["version"] for row in rows}

    def migrate(self, migrations: list):
        """Apply pending migrations in order"""
        applied = self.get_applied_versions()
        pending = [m for m in migrations if m.version not in applied]
        pending.sort(key=lambda m: m.version)

        for migration in pending:
            print(f"Applying {migration.version}: {migration.description}")
            try:
                self.db.execute(migration.up_sql)
                self.db.execute(
                    "INSERT INTO schema_migrations (version, description, checksum) "
                    "VALUES (%s, %s, %s)",
                    (migration.version, migration.description, migration.checksum)
                )
                self.db.commit()
                print(f"  ✓ Applied {migration.version}")
            except Exception as e:
                self.db.rollback()
                print(f"  ✗ Failed {migration.version}: {e}")
                raise

    def rollback(self, migrations: list, target_version: str):
        """Rollback migrations down to target version"""
        applied = self.get_applied_versions()
        to_rollback = [
            m for m in reversed(migrations)
            if m.version in applied and m.version > target_version
        ]
        for migration in to_rollback:
            print(f"Rolling back {migration.version}")
            self.db.execute(migration.down_sql)
            self.db.execute(
                "DELETE FROM schema_migrations WHERE version = %s",
                (migration.version,)
            )
            self.db.commit()


# Example migrations:
migrations = [
    SchemaMigration(
        "001", "Create users table",
        up_sql="CREATE TABLE users (id UUID PRIMARY KEY, email TEXT UNIQUE, name TEXT)",
        down_sql="DROP TABLE users"
    ),
    SchemaMigration(
        "002", "Add created_at to users",
        up_sql="ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()",
        down_sql="ALTER TABLE users DROP COLUMN created_at"
    ),
    SchemaMigration(
        "003", "Create orders table",
        up_sql="""CREATE TABLE orders (
            id UUID PRIMARY KEY, user_id UUID REFERENCES users(id),
            total DECIMAL(10,2), status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT now()
        )""",
        down_sql="DROP TABLE orders"
    ),
]
```

---

## F. Summary & Practice

### Key Takeaways

1. **Schema design** is driven by data model + access patterns
2. **Normalization** (3NF) eliminates redundancy; use as baseline for SQL
3. **Denormalization** trades write complexity for read speed; use deliberately
4. **NoSQL schema**: design for access patterns first (DynamoDB single table design)
5. **JSONB** in PostgreSQL gives document-like flexibility within SQL
6. **Snapshot values** (unit_price at order time) preserve historical accuracy
7. **Schema migrations** must be backward-compatible (expand-contract pattern)
8. **Indexes** should match your WHERE, ORDER BY, and JOIN columns
9. **Materialized aggregates** (avg_rating, review_count) avoid expensive COUNT/AVG queries
10. Always list your **access patterns** before designing the schema

### Interview Questions

1. How do you approach schema design for a new system?
2. What is normalization? When would you denormalize?
3. How do you design a DynamoDB single table?
4. How do you handle schema migrations without downtime?
5. Design the database schema for [system X].
6. What is the expand-contract migration pattern?

### Practice Exercises

1. **Exercise 1**: Design the full database schema for Airbnb: users, listings, bookings, reviews, payments, messages. Include indexes for the 10 most common queries.
2. **Exercise 2**: Convert a normalized SQL schema for a blog (users, posts, comments, tags) to a DynamoDB single table design. Show the PK/SK patterns and GSIs.
3. **Exercise 3**: Your production table has 500M rows and you need to add a NOT NULL column. Design the zero-downtime migration plan.

---

> **Previous**: [08 — Write Scaling](08-write-scaling.md)
> **Next**: [10 — Indexing Strategy](10-indexing-strategy.md)
