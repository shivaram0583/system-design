# Back-of-Envelope Estimation Cheat Sheet

> Use these formulas and reference numbers to quickly estimate capacity in system design interviews.

---

## Step-by-Step Estimation Framework

```
1. Identify the core action (e.g., "send a message", "upload a photo")
2. Estimate DAU (Daily Active Users)
3. Estimate actions per user per day
4. Calculate QPS = (DAU × actions/user) / 86,400
5. Calculate Peak QPS = QPS × 2 (or ×3 for spiky workloads)
6. Calculate storage = actions/day × size per action × retention period
7. Calculate bandwidth = QPS × average response size
8. Calculate cache size = top 20% of hot data
```

---

## Reference Numbers

### Time Constants

| Period | Seconds |
|--------|---------|
| 1 minute | 60 |
| 1 hour | 3,600 |
| 1 day | 86,400 (~10^5) |
| 1 month | 2,592,000 (~2.5 × 10^6) |
| 1 year | 31,536,000 (~3 × 10^7) |

### Data Size Constants

| Unit | Bytes | Approx |
|------|-------|--------|
| 1 KB | 1,024 | 10^3 |
| 1 MB | 1,048,576 | 10^6 |
| 1 GB | ~1 billion | 10^9 |
| 1 TB | ~1 trillion | 10^12 |
| 1 PB | ~1 quadrillion | 10^15 |

### Typical Data Sizes

| Data Type | Typical Size |
|-----------|-------------|
| UUID | 16 bytes |
| Integer (int64) | 8 bytes |
| Timestamp | 8 bytes |
| Short string (name, email) | 50–100 bytes |
| URL | 100–200 bytes |
| Tweet / short message | 140–280 bytes |
| Chat message | 100–500 bytes |
| JSON API response | 1–10 KB |
| Thumbnail image | 10–50 KB |
| Web page | 2–3 MB |
| Photo (compressed) | 200 KB – 2 MB |
| Photo (high-res) | 5–15 MB |
| 1 min of video (720p) | ~5 MB |
| 1 min of video (1080p) | ~15 MB |
| 1 min of audio (MP3) | ~1 MB |

### Throughput Reference

| System | Typical QPS |
|--------|------------|
| Single web server | 1K–10K |
| Single SQL DB (PostgreSQL/MySQL) | 1K–5K |
| Redis (single node) | 100K+ |
| Kafka (single broker) | 100K–1M messages/sec |
| Elasticsearch | 1K–10K queries/sec |
| CDN edge server | 10K–100K |

### Network Bandwidth

| Connection | Speed |
|-----------|-------|
| 1 Gbps link | 125 MB/s |
| 10 Gbps link | 1.25 GB/s |
| Typical server NIC | 1–10 Gbps |

---

## Common Estimation Templates

### Template 1: URL Shortener

```
Assumptions:
  - 100M new URLs/month
  - Read:Write = 100:1
  - URL record size = 500 bytes
  - Retention = 5 years

Write QPS:
  100M / (30 × 86,400) = 100M / 2.6M ≈ 40 writes/sec

Read QPS:
  40 × 100 = 4,000 reads/sec

Storage (5 years):
  100M × 12 × 5 = 6B records
  6B × 500 bytes = 3 TB

Cache (20% hot data):
  4,000 reads/sec × 86,400 sec × 500 bytes × 0.20 ≈ 35 GB
```

### Template 2: Chat Application (WhatsApp-like)

```
Assumptions:
  - 500M DAU
  - 40 messages/user/day
  - Average message = 100 bytes
  - Metadata overhead = 100 bytes/message
  - Retention = forever

Daily messages:
  500M × 40 = 20B messages/day

Message QPS:
  20B / 86,400 ≈ 230K messages/sec

Peak QPS:
  230K × 3 ≈ 700K messages/sec

Daily storage:
  20B × 200 bytes = 4 TB/day

Annual storage:
  4 TB × 365 = 1.46 PB/year
```

### Template 3: Social Media Feed (Instagram-like)

```
Assumptions:
  - 500M DAU
  - 10% post per day = 50M posts/day
  - Average post = 200 KB (image) + 1 KB (metadata)
  - Feed reads = 500M × 10 feeds/day = 5B reads/day

Write QPS (posts):
  50M / 86,400 ≈ 580 posts/sec

Read QPS (feeds):
  5B / 86,400 ≈ 58K reads/sec

Daily storage:
  50M × 201 KB ≈ 10 TB/day

Annual storage:
  10 TB × 365 = 3.65 PB/year
```

### Template 4: Video Streaming (YouTube-like)

```
Assumptions:
  - 1B DAU
  - 5 videos watched/user/day
  - Average video = 300 MB
  - 500K new videos uploaded/day
  - Average upload = 300 MB

Video views/sec:
  5B / 86,400 ≈ 58K views/sec

Upload QPS:
  500K / 86,400 ≈ 6 uploads/sec

Bandwidth (viewing):
  58K × 5 MB/sec (streaming bitrate) = 290 GB/sec = 2.3 Tbps

Storage (daily uploads):
  500K × 300 MB = 150 TB/day
  (Multiple resolutions: 150 TB × 3 = 450 TB/day)
```

---

## Quick Formulas

| What | Formula |
|------|---------|
| **QPS** | DAU × actions_per_user / 86,400 |
| **Peak QPS** | QPS × 2 (or ×3) |
| **Storage** | daily_records × record_size × days |
| **Bandwidth** | QPS × avg_response_size |
| **Cache size** | daily_reads × avg_size × 0.20 |
| **Servers needed** | Peak_QPS / QPS_per_server |
| **DB shards** | Total_data / max_data_per_shard |

---

## Interview Tips for Estimation

1. **Round aggressively** — 86,400 ≈ 100,000. Interviewers want order-of-magnitude, not precision
2. **State assumptions first** — always say your assumptions before calculating
3. **Use powers of 10** — think in orders of magnitude
4. **Sanity check** — does your answer feel reasonable? 1 PB/day for a chat app? Probably wrong
5. **Know your multipliers** — seconds in a day (~10^5), seconds in a year (~3×10^7)
6. **Don't forget metadata** — timestamps, user IDs, indexes add overhead
7. **Account for replication** — multiply storage by replication factor (usually 3)
8. **Consider compression** — text compresses 5-10x, already-compressed media doesn't
