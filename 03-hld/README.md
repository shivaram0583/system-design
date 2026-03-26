# High-Level Design (HLD) Problems

> Each HLD covers: Requirements, Capacity Estimation, API Design, Database Choice, Architecture Diagram, Data Flow, Scaling, Bottlenecks, and Trade-offs.

## Problems

| # | System | Difficulty | Key Concepts Tested |
|---|--------|-----------|-------------------|
| 01 | [URL Shortener](01-url-shortener.md) | Easy | Hashing, KV store, caching, redirection |
| 02 | [Pastebin](02-pastebin.md) | Easy | Object storage, unique IDs, TTL |
| 03 | [Rate Limiter](03-rate-limiter.md) | Easy-Med | Sliding window, distributed counting |
| 04 | [Notification System](04-notification-system.md) | Medium | Push/pull, queues, priority, templating |
| 05 | [Chat Application](05-chat-application.md) | Medium | WebSocket, presence, message ordering |
| 06 | [Uber / Ride-Hailing](06-uber-ride-hailing.md) | Hard | Geospatial, matching, real-time tracking |
| 07 | [Food Delivery](07-food-delivery.md) | Hard | Multi-party, ETA, dispatch optimization |
| 08 | [Social Media Feed](08-social-media-feed.md) | Medium | Fan-out, ranking, caching |
| 09 | [Instagram](09-instagram.md) | Medium | Media storage, CDN, feed generation |
| 10 | [Twitter/X Timeline](10-twitter-timeline.md) | Medium | Fan-out on write vs read, celebrity problem |
| 11 | [YouTube](11-youtube.md) | Hard | Video processing, streaming, recommendations |
| 12 | [Netflix](12-netflix.md) | Hard | Adaptive streaming, CDN, microservices |
| 13 | [Dropbox / Google Drive](13-dropbox-google-drive.md) | Hard | File sync, chunking, conflict resolution |
| 14 | [Web Crawler](14-web-crawler.md) | Medium | BFS/DFS, politeness, dedup, distributed |
| 15 | [Search Autocomplete](15-search-autocomplete.md) | Medium | Trie, prefix matching, ranking |
| 16 | [API Rate Limiting Gateway](16-api-rate-limiting-gateway.md) | Medium | Token bucket, distributed state |
| 17 | [E-Commerce Platform](17-ecommerce-platform.md) | Hard | Catalog, cart, inventory, payments |
| 18 | [Payment System](18-payment-system.md) | Hard | Idempotency, reconciliation, PCI |
| 19 | [Inventory Management](19-inventory-management.md) | Medium | Stock tracking, reservations, consistency |
| 20 | [Hotel Booking](20-hotel-booking.md) | Medium | Availability, overbooking, double booking |
| 21 | [Ticket Booking](21-ticket-booking.md) | Medium | Seat locking, concurrency, fairness |
| 22 | [Distributed Cache](22-distributed-cache.md) | Medium | Consistent hashing, eviction, replication |
| 23 | [Distributed Job Scheduler](23-distributed-job-scheduler.md) | Hard | Cron, at-least-once, priority queues |
| 24 | [Logging / Monitoring](24-logging-monitoring-system.md) | Medium | ELK stack, time-series, alerting |
| 25 | [Real-Time Collab Editor](25-realtime-collaborative-editor.md) | Hard | CRDT/OT, conflict resolution, cursors |
| 26 | [Stock Trading Platform](26-stock-trading-platform.md) | Hard | Order matching, low latency, audit trail |
| 27 | [Ad Click Tracking](27-ad-click-tracking.md) | Medium | Event streaming, deduplication, analytics |

## Recommended Order

**Start with these** (build foundational patterns):
1. URL Shortener → learn basic HLD structure
2. Rate Limiter → learn distributed algorithms
3. Notification System → learn async processing

**Then these** (social/messaging patterns):
4. Chat Application → WebSocket, presence
5. Twitter Timeline → fan-out strategies
6. Instagram → media + feed

**Then these** (complex systems):
7. YouTube / Netflix → video pipeline
8. Uber → geospatial + real-time
9. E-Commerce → multi-domain
10. Payment System → financial correctness
