# System Design — From Beginner to Advanced

> A comprehensive, structured guide to System Design covering core concepts, High-Level Design (HLD), Low-Level Design (LLD), and real-world system architectures. Built for interview preparation and practical engineering knowledge.

---

## Table of Contents

- [Learning Roadmap](#learning-roadmap)
- [Top 20 Concepts to Master First](#top-20-concepts-to-master-first)
- [12-Week Study Plan](#12-week-study-plan)
- [Repository Structure](#repository-structure)
- [How to Use This Repository](#how-to-use-this-repository)

---

## Learning Roadmap

The roadmap is organized in 4 parallel tracks. Work through them in phases — each phase builds on the previous.

```
Phase 1: Foundation (Weeks 1–3)
│
│   TRACK 1: Core Concepts           TRACK 2: Databases
│   ├── What is System Design        ├── SQL vs NoSQL
│   ├── Client-Server Architecture   ├── Key-Value Stores
│   ├── Monolith vs Microservices    ├── Document DBs
│   ├── Latency vs Throughput        ├── Schema Design
│   ├── Scalability (H vs V)         └── Indexing Strategy
│   ├── Availability & Reliability
│   ├── Consistency Models
│   ├── CAP Theorem
│   ├── ACID vs BASE
│   └── Stateless vs Stateful
│
Phase 2: Building Blocks (Weeks 4–6)
│
│   TRACK 1: Core Concepts           TRACK 2: Databases
│   ├── Load Balancing               ├── Columnar DBs
│   ├── Reverse Proxy                ├── Graph DBs
│   ├── API Gateway                  ├── Time-Series DBs
│   ├── CDN                          ├── Read Replicas
│   ├── Caching                      ├── Write Scaling
│   ├── Message Queues               ├── Query Optimization
│   ├── Event-Driven Architecture    └── Backup & Recovery
│   ├── Pub-Sub
│   ├── Rate Limiting
│   └── Idempotency
│
Phase 3: Advanced Patterns (Weeks 7–9)
│
│   TRACK 1: Core Concepts           TRACK 3: HLD Problems
│   ├── Circuit Breaker              ├── URL Shortener
│   ├── Retry, Timeout, Backoff      ├── Pastebin
│   ├── Service Discovery            ├── Rate Limiter
│   ├── Distributed Locks            ├── Notification System
│   ├── Sharding & Partitioning      ├── Chat Application
│   ├── Replication                  ├── Social Media Feed
│   ├── Leader-Follower              ├── YouTube / Netflix
│   ├── Consensus Basics             └── Dropbox / Google Drive
│   ├── Data Indexing
│   ├── Full-Text Search
│   ├── Blob/Object Storage
│   ├── Stream & Batch Processing
│   ├── Observability
│   ├── Security Basics
│   └── Auth (OAuth, JWT, Sessions)
│
Phase 4: Mastery (Weeks 10–12)
│
│   TRACK 3: HLD Problems            TRACK 4: LLD Problems
│   ├── Uber / Ride-Hailing          ├── Parking Lot
│   ├── Food Delivery                ├── Elevator System
│   ├── E-Commerce Platform          ├── Library Management
│   ├── Payment System               ├── BookMyShow Booking
│   ├── Hotel/Ticket Booking         ├── ATM / Vending Machine
│   ├── Distributed Cache            ├── Splitwise
│   ├── Job Scheduler                ├── Chess / Tic-Tac-Toe
│   ├── Web Crawler                  ├── Pub-Sub System
│   ├── Search Autocomplete          ├── LRU/LFU Cache
│   ├── Real-Time Collab Editor      ├── Rate Limiter
│   ├── Stock Trading Platform       ├── Logger Framework
│   └── Ad Click Tracking            └── Notification Service
│
Phase 5: Interview Readiness (Ongoing)
│
│   TRACK 5: Comparison & Decisions   TRACK 6: Interview Prep
│   ├── DB Selection Framework        ├── 45-min Interview Approach
│   ├── Cache Selection               ├── Clarifying Questions
│   ├── Kafka vs RabbitMQ             ├── Requirement Gathering
│   ├── SQL vs NoSQL Decision         ├── Envelope Calculations
│   ├── Mono vs Micro Decision        ├── API Design
│   ├── Sync vs Async                 ├── Defending Trade-offs
│   └── REST vs gRPC vs GraphQL       └── Time Management
```

---

## Top 20 Concepts to Master First

These are the **non-negotiable foundations**. Every system design discussion builds on these.

| # | Concept | Why It Matters | Priority |
|---|---------|---------------|----------|
| 1 | **Scalability (Horizontal vs Vertical)** | Every system must scale; this is the starting point of all design decisions | 🔴 Critical |
| 2 | **Load Balancing** | Distributes traffic; enables horizontal scaling | 🔴 Critical |
| 3 | **Caching** | Reduces latency and DB load; appears in every design | 🔴 Critical |
| 4 | **Database Fundamentals (SQL vs NoSQL)** | Wrong DB choice = redesign; affects every component | 🔴 Critical |
| 5 | **CAP Theorem** | Defines fundamental trade-offs in distributed systems | 🔴 Critical |
| 6 | **Consistency Models** | Strong vs eventual consistency drives architecture decisions | 🔴 Critical |
| 7 | **Sharding & Partitioning** | Enables horizontal data scaling beyond single machine | 🔴 Critical |
| 8 | **Replication** | Enables availability and read scaling | 🔴 Critical |
| 9 | **Message Queues & Async Processing** | Decouples services; handles spikes; enables reliability | 🔴 Critical |
| 10 | **API Design (REST, gRPC, GraphQL)** | The contract between services; first thing you design | 🔴 Critical |
| 11 | **Latency vs Throughput** | Core performance trade-off in every system | 🟠 High |
| 12 | **Availability & Reliability** | SLAs, uptime, failure tolerance — always discussed | 🟠 High |
| 13 | **CDN** | Essential for serving static content at scale globally | 🟠 High |
| 14 | **Rate Limiting** | Protects services from abuse and cascading failures | 🟠 High |
| 15 | **Pub-Sub / Event-Driven Architecture** | Foundation of modern microservices communication | 🟠 High |
| 16 | **ACID vs BASE** | Determines transaction guarantees and DB choice | 🟠 High |
| 17 | **Monolith vs Microservices** | Architecture decision that affects everything downstream | 🟠 High |
| 18 | **Authentication & Authorization** | Security is never optional; OAuth/JWT always come up | 🟡 Medium |
| 19 | **Observability (Logs, Metrics, Traces)** | You can't fix what you can't see; operational maturity | 🟡 Medium |
| 20 | **Back-of-Envelope Estimation** | Required in every interview to justify design decisions | 🟡 Medium |

---

## 12-Week Study Plan

### Week 1: Foundations I
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | What is System Design + Client-Server Architecture | Core | 2 hrs |
| 2 | Monolith vs Microservices | Core | 2 hrs |
| 3 | Latency vs Throughput + Scalability | Core | 2 hrs |
| 4 | Availability, Reliability, Consistency | Core | 2 hrs |
| 5 | CAP Theorem + ACID vs BASE | Core | 2 hrs |
| 6 | Horizontal vs Vertical Scaling + Stateless vs Stateful | Core | 2 hrs |
| 7 | **Review & Practice**: Summarize all concepts, draw diagrams | Review | 2 hrs |

### Week 2: Foundations II
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | Load Balancing (algorithms, L4 vs L7) | Core | 2 hrs |
| 2 | Reverse Proxy + API Gateway | Core | 2 hrs |
| 3 | CDN (pull vs push, cache invalidation) | Core | 2 hrs |
| 4 | Caching (strategies, eviction, consistency) | Core | 2.5 hrs |
| 5 | SQL vs NoSQL + Key-Value Stores | DB | 2 hrs |
| 6 | Document DB + Schema Design | DB | 2 hrs |
| 7 | **Review & Practice**: Design a simple read-heavy system | Review | 2.5 hrs |

### Week 3: Communication & Messaging
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | Message Queues (Kafka, RabbitMQ, SQS) | Core | 2 hrs |
| 2 | Event-Driven Architecture + Pub-Sub | Core | 2 hrs |
| 3 | Rate Limiting + Idempotency | Core | 2 hrs |
| 4 | Sync vs Async Communication | Core | 1.5 hrs |
| 5 | REST vs gRPC vs GraphQL | Core | 2 hrs |
| 6 | Columnar DB + Graph DB + Time-Series DB | DB | 2 hrs |
| 7 | **Review & Practice**: Design a notification pipeline | Review | 2.5 hrs |

### Week 4: Resilience & Data Patterns
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | Circuit Breaker + Retry/Timeout/Backoff | Core | 2 hrs |
| 2 | Service Discovery + Distributed Locks | Core | 2 hrs |
| 3 | Sharding + Partitioning strategies | Core | 2.5 hrs |
| 4 | Replication + Leader-Follower + Consensus | Core | 2.5 hrs |
| 5 | Read Replicas + Write Scaling | DB | 2 hrs |
| 6 | Indexing Strategy + Query Optimization | DB | 2 hrs |
| 7 | **Review & Practice**: Design a write-heavy system | Review | 2.5 hrs |

### Week 5: Search, Storage & Processing
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | Data Indexing + Full-Text Search | Core | 2 hrs |
| 2 | Blob/Object Storage (S3 patterns) | Core | 1.5 hrs |
| 3 | Stream Processing + Batch Processing | Core | 2.5 hrs |
| 4 | Observability (Logging, Metrics, Tracing) | Core | 2 hrs |
| 5 | Security + Auth (OAuth, JWT, Sessions) | Core | 2.5 hrs |
| 6 | Encryption at rest and in transit | Core | 1.5 hrs |
| 7 | **Review & Practice**: Back-of-envelope calculations practice | Review | 2.5 hrs |

### Week 6: HLD Warm-Up
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | HLD: URL Shortener / TinyURL | HLD | 2.5 hrs |
| 2 | HLD: Pastebin | HLD | 2 hrs |
| 3 | HLD: Rate Limiter | HLD | 2.5 hrs |
| 4 | HLD: Notification System | HLD | 2.5 hrs |
| 5 | LLD: Parking Lot | LLD | 2.5 hrs |
| 6 | LLD: Elevator System | LLD | 2.5 hrs |
| 7 | **Review & Practice**: Mock interview — URL Shortener | Review | 2 hrs |

### Week 7: Messaging & Social
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | HLD: Chat Application (WhatsApp-like) | HLD | 3 hrs |
| 2 | HLD: Social Media Feed (Instagram) | HLD | 3 hrs |
| 3 | HLD: Twitter/X Timeline | HLD | 2.5 hrs |
| 4 | LLD: Library Management System | LLD | 2.5 hrs |
| 5 | LLD: BookMyShow Booking Module | LLD | 2.5 hrs |
| 6 | LLD: Splitwise | LLD | 2.5 hrs |
| 7 | **Review & Practice**: Mock interview — Chat System | Review | 2 hrs |

### Week 8: Media & Storage Systems
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | HLD: YouTube | HLD | 3 hrs |
| 2 | HLD: Netflix | HLD | 3 hrs |
| 3 | HLD: Dropbox / Google Drive | HLD | 3 hrs |
| 4 | LLD: ATM System | LLD | 2 hrs |
| 5 | LLD: Vending Machine | LLD | 2 hrs |
| 6 | LLD: Cache with LRU/LFU | LLD | 2.5 hrs |
| 7 | **Review & Practice**: Mock interview — YouTube | Review | 2 hrs |

### Week 9: Location & Commerce
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | HLD: Uber / Ride-Hailing | HLD | 3 hrs |
| 2 | HLD: Food Delivery System | HLD | 3 hrs |
| 3 | HLD: E-Commerce Platform | HLD | 3 hrs |
| 4 | HLD: Payment System | HLD | 2.5 hrs |
| 5 | LLD: Chess Game | LLD | 2 hrs |
| 6 | LLD: Snake & Ladder + Tic-Tac-Toe | LLD | 2 hrs |
| 7 | **Review & Practice**: Mock interview — Uber | Review | 2 hrs |

### Week 10: Infrastructure Systems
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | HLD: Web Crawler | HLD | 2.5 hrs |
| 2 | HLD: Search Autocomplete | HLD | 2.5 hrs |
| 3 | HLD: Distributed Cache | HLD | 2.5 hrs |
| 4 | HLD: Distributed Job Scheduler | HLD | 2.5 hrs |
| 5 | HLD: Logging / Monitoring System | HLD | 2.5 hrs |
| 6 | LLD: Pub-Sub System + Logger Framework | LLD | 3 hrs |
| 7 | **Review & Practice**: Mock interview — Distributed Cache | Review | 2 hrs |

### Week 11: Advanced Systems
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | HLD: Real-Time Collaborative Editor | HLD | 3 hrs |
| 2 | HLD: Stock Trading Platform | HLD | 3 hrs |
| 3 | HLD: Ad Click Tracking System | HLD | 2.5 hrs |
| 4 | HLD: Hotel / Ticket Booking System | HLD | 2.5 hrs |
| 5 | HLD: Inventory Management + API Rate Limiting Gateway | HLD | 3 hrs |
| 6 | LLD: Rate Limiter + Notification Service + Payment Module | LLD | 3 hrs |
| 7 | **Review & Practice**: Mock interview — Stock Trading | Review | 2 hrs |

### Week 12: Interview Mastery
| Day | Topic | Track | Time |
|-----|-------|-------|------|
| 1 | Comparison: DB selection, Cache selection | Decision | 2 hrs |
| 2 | Comparison: Kafka vs RabbitMQ, SQL vs NoSQL | Decision | 2 hrs |
| 3 | Comparison: Mono vs Micro, REST vs gRPC vs GraphQL | Decision | 2 hrs |
| 4 | Interview Prep: 45-min approach, clarifying questions | Interview | 2.5 hrs |
| 5 | Interview Prep: Envelope calcs, API design, trade-offs | Interview | 2.5 hrs |
| 6 | Full mock interview practice (2 problems) | Interview | 3 hrs |
| 7 | **Final Review**: Revisit weak areas, consolidate notes | Review | 3 hrs |

---

## Repository Structure

```
system-design/
│
├── README.md                          ← You are here
│
├── 01-fundamentals/
│   ├── README.md                      ← Index for all fundamentals
│   ├── 01-what-is-system-design.md
│   ├── 02-client-server-architecture.md
│   ├── 03-monolith-vs-microservices.md
│   ├── 04-latency-vs-throughput.md
│   ├── 05-scalability.md
│   ├── 06-availability-reliability.md
│   ├── 07-consistency.md
│   ├── 08-cap-theorem.md
│   ├── 09-acid-vs-base.md
│   ├── 10-horizontal-vs-vertical-scaling.md
│   ├── 11-stateless-vs-stateful.md
│   ├── 12-load-balancing.md
│   ├── 13-reverse-proxy.md
│   ├── 14-api-gateway.md
│   ├── 15-cdn.md
│   ├── 16-caching.md
│   ├── 17-message-queues.md
│   ├── 18-event-driven-architecture.md
│   ├── 19-pub-sub.md
│   ├── 20-rate-limiting.md
│   ├── 21-idempotency.md
│   ├── 22-circuit-breaker.md
│   ├── 23-retry-timeout-backoff.md
│   ├── 24-service-discovery.md
│   ├── 25-distributed-locks.md
│   ├── 26-sharding.md
│   ├── 27-replication.md
│   ├── 28-partitioning.md
│   ├── 29-leader-follower.md
│   ├── 30-consensus-basics.md
│   ├── 31-data-indexing.md
│   ├── 32-full-text-search.md
│   ├── 33-blob-object-storage.md
│   ├── 34-stream-processing.md
│   ├── 35-batch-processing.md
│   ├── 36-observability.md
│   ├── 37-logging-metrics-tracing.md
│   ├── 38-security-basics.md
│   ├── 39-authentication.md
│   ├── 40-authorization.md
│   ├── 41-oauth-jwt-sessions.md
│   └── 42-encryption.md
│
├── 02-databases/
│   ├── README.md
│   ├── 01-sql-vs-nosql.md
│   ├── 02-key-value-store.md
│   ├── 03-document-db.md
│   ├── 04-columnar-db.md
│   ├── 05-graph-db.md
│   ├── 06-time-series-db.md
│   ├── 07-read-replicas.md
│   ├── 08-write-scaling.md
│   ├── 09-schema-design.md
│   ├── 10-indexing-strategy.md
│   ├── 11-query-optimization.md
│   ├── 12-data-archival.md
│   └── 13-backup-recovery.md
│
├── 03-hld/
│   ├── README.md
│   ├── 01-url-shortener.md
│   ├── 02-pastebin.md
│   ├── 03-rate-limiter.md
│   ├── 04-notification-system.md
│   ├── 05-chat-application.md
│   ├── 06-uber-ride-hailing.md
│   ├── 07-food-delivery.md
│   ├── 08-social-media-feed.md
│   ├── 09-instagram.md
│   ├── 10-twitter-timeline.md
│   ├── 11-youtube.md
│   ├── 12-netflix.md
│   ├── 13-dropbox-google-drive.md
│   ├── 14-web-crawler.md
│   ├── 15-search-autocomplete.md
│   ├── 16-api-rate-limiting-gateway.md
│   ├── 17-ecommerce-platform.md
│   ├── 18-payment-system.md
│   ├── 19-inventory-management.md
│   ├── 20-hotel-booking.md
│   ├── 21-ticket-booking.md
│   ├── 22-distributed-cache.md
│   ├── 23-distributed-job-scheduler.md
│   ├── 24-logging-monitoring-system.md
│   ├── 25-realtime-collaborative-editor.md
│   ├── 26-stock-trading-platform.md
│   └── 27-ad-click-tracking.md
│
├── 04-lld/
│   ├── README.md
│   ├── 01-parking-lot.md
│   ├── 02-elevator-system.md
│   ├── 03-library-management.md
│   ├── 04-bookmyshow-booking.md
│   ├── 05-atm.md
│   ├── 06-vending-machine.md
│   ├── 07-splitwise.md
│   ├── 08-chess.md
│   ├── 09-snake-and-ladder.md
│   ├── 10-tic-tac-toe.md
│   ├── 11-pub-sub-system.md
│   ├── 12-cache-lru-lfu.md
│   ├── 13-rate-limiter.md
│   ├── 14-logger-framework.md
│   ├── 15-notification-service.md
│   └── 16-payment-processing.md
│
├── 05-comparisons/
│   ├── README.md
│   ├── 01-how-to-choose-db.md
│   ├── 02-how-to-choose-cache.md
│   ├── 03-kafka-vs-rabbitmq.md
│   ├── 04-sql-vs-nosql-decision.md
│   ├── 05-monolith-vs-microservices-decision.md
│   ├── 06-sync-vs-async.md
│   └── 07-rest-vs-grpc-vs-graphql.md
│
├── 06-interview-prep/
│   ├── README.md
│   ├── 01-45-minute-approach.md
│   ├── 02-clarifying-questions.md
│   ├── 03-requirement-gathering.md
│   ├── 04-envelope-calculations.md
│   ├── 05-api-design.md
│   ├── 06-defending-tradeoffs.md
│   ├── 07-communication.md
│   └── 08-time-management.md
│
└── cheatsheets/
    ├── concepts-cheatsheet.md
    ├── estimation-cheatsheet.md
    └── interview-checklist.md
```

---

## How to Use This Repository

1. **Follow the roadmap** — Go phase by phase, don't skip fundamentals
2. **Read each topic file** — Every file follows the standard framework (Concept → Interview View → Practical View → Example → HLD/LLD)
3. **Practice actively** — Use the interview questions and exercises at the end of each topic
4. **Do mock interviews** — Use the review days to simulate 45-minute design sessions
5. **Revise using cheatsheets** — Quick reference before interviews

---

> **Next**: Start with [01-fundamentals/01-what-is-system-design.md](01-fundamentals/01-what-is-system-design.md)
