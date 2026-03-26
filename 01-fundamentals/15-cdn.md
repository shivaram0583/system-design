# Topic 15: CDN (Content Delivery Network)

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Beginner → Intermediate
> **Prerequisites**: Topics 1–14

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

### What is a CDN?

A **Content Delivery Network** is a geographically distributed network of servers that caches and serves content from locations close to the end user, reducing latency and load on origin servers.

```
WITHOUT CDN:
  User in Tokyo ───────── 200ms ────────► Origin in Virginia
  Every request travels across the globe.

WITH CDN:
  User in Tokyo ──── 10ms ────► CDN Edge (Tokyo)
                                    │ cache miss? 
                                    ▼
                              Origin (Virginia)
                              (only on first request)
  
  Subsequent users in Tokyo get content from the Tokyo edge = 10ms
```

### How CDNs Work

```
1. FIRST REQUEST (cache miss):
   User → CDN Edge → No cached copy → Fetch from Origin → Cache at Edge → Return to User

2. SUBSEQUENT REQUESTS (cache hit):
   User → CDN Edge → Cached copy exists → Return immediately (no origin call)

3. CACHE EXPIRY:
   TTL expires → Next request triggers re-fetch from origin
   OR: Origin sends invalidation to CDN → CDN purges stale content
```

### Push vs Pull CDN

| Type | How | Pros | Cons | Best For |
|------|-----|------|------|----------|
| **Pull (Lazy)** | CDN fetches from origin on first request | Simple setup; auto-caches popular content | First request is slow (cache miss) | Dynamic websites, APIs |
| **Push (Eager)** | You upload content to CDN proactively | No cache miss penalty; full control | Must manage uploads; wastes space for unpopular content | Static assets, software updates, video |

### What Can a CDN Cache?

| Content Type | Cacheable? | TTL |
|-------------|-----------|-----|
| Static images (PNG, JPG) | Always | Hours to days |
| CSS, JavaScript bundles | Always | Hours (with cache-busting hashes) |
| HTML pages | Sometimes | Seconds to minutes |
| API responses (GET) | Sometimes | Seconds (with Vary headers) |
| Video/Audio | Always | Days |
| Personalized content | Never (at CDN) | N/A |
| POST/PUT/DELETE | Never | N/A |

### CDN Providers

| Provider | Edge Locations | Strengths |
|----------|---------------|-----------|
| **CloudFront** (AWS) | 400+ | Deep AWS integration, Lambda@Edge |
| **Cloudflare** | 300+ | DDoS protection, free tier, Workers |
| **Akamai** | 4000+ | Largest network, enterprise |
| **Fastly** | 80+ | Real-time purge, edge compute (Wasm) |
| **Google Cloud CDN** | 150+ | GCP integration, Anycast |
| **Azure CDN** | 170+ | Azure integration |

---

## B. Interview View

### What Interviewers Expect

- Know what a CDN is and when to use one
- Understand cache invalidation strategies
- Can calculate latency improvement with CDN
- Know push vs pull and trade-offs

### Red Flags

- Serving static assets from the origin server in a global system
- Not mentioning CDN in any system design with global users
- Not considering cache invalidation

### Common Questions

1. What is a CDN and how does it work?
2. When would you use a CDN? When wouldn't you?
3. How does cache invalidation work in a CDN?
4. What is the difference between push and pull CDN?
5. How would you serve images for a global social media app?

---

## C. Practical Engineering View

### Cache Invalidation Strategies

```
1. TTL-BASED (Time To Live):
   Cache-Control: max-age=3600  (cache for 1 hour)
   Simple but stale content possible until TTL expires.

2. CACHE-BUSTING (versioned URLs):
   /static/app.js → /static/app.abc123.js
   New deploy → new hash → new URL → CDN fetches fresh copy
   Old URL still cached (no stale content issue).

3. PURGE/INVALIDATION API:
   POST /purge { "paths": ["/images/logo.png"] }
   CDN immediately removes cached content.
   Fastly: <1s global purge. CloudFront: 1-5 min.

4. STALE-WHILE-REVALIDATE:
   Cache-Control: max-age=60, stale-while-revalidate=300
   Serve stale content immediately while fetching fresh in background.
   Best UX: instant response, eventual freshness.
```

### CDN Costs

```
Typical pricing (CloudFront):
  First 10 TB/month:  $0.085/GB (US/EU)
  Next 40 TB:         $0.080/GB
  Next 100 TB:        $0.060/GB
  
  Example: Serving 1 TB/month of images
    Cost: ~$85/month
    Without CDN: Origin bandwidth + higher latency + more server load
    
  Origin shield (reduce origin hits):
    Extra $0.01/10K requests but 50-90% fewer origin fetches
```

---

## D. Example: Global Image Service

```
Architecture:
  ┌────────┐     ┌─────────────┐     ┌──────────────┐
  │ Client │────►│ CloudFront  │────►│ S3 (Origin)  │
  │ (Tokyo)│     │ Edge (Tokyo)│     │ (us-east-1)  │
  └────────┘     └─────────────┘     └──────────────┘

Upload flow:
  App Server → S3 (original) → Lambda (resize) → S3 (variants)
  
  S3 stores: /images/123/original.jpg  (5 MB)
             /images/123/thumb_200.jpg (20 KB)
             /images/123/medium_800.jpg (100 KB)

Request flow:
  GET https://cdn.example.com/images/123/thumb_200.jpg
  → CloudFront edge (Tokyo): Cache HIT → return 20 KB in 10ms
  → Cache MISS → fetch from S3 → cache → return

  Cache-Control: public, max-age=86400, immutable
  (Images are immutable — new version = new URL)

Performance:
  Without CDN: 200ms (Tokyo → Virginia round trip)
  With CDN: 10ms (Tokyo edge) + 99% cache hit rate
  Origin load reduction: 99% fewer requests to S3
```

---

## E. HLD and LLD

### E.1 HLD — CDN-Backed Static Site

```
┌──────────────────────────────────────────────────────┐
│  Users (Global)                                       │
│      │                                                │
│  ┌───┴──────────┐                                     │
│  │  DNS (Route53)│  → cdn.example.com → CloudFront    │
│  └───┬──────────┘                                     │
│      │                                                │
│  ┌───┴──────────────┐                                 │
│  │  CloudFront CDN  │                                 │
│  │  400+ edge PoPs  │                                 │
│  │                   │                                 │
│  │  Cache behaviors: │                                 │
│  │  /static/* → S3 (1 day TTL)                       │
│  │  /api/*    → ALB (0 TTL, passthrough)             │
│  │  /*        → S3 (5 min TTL, SPA fallback)         │
│  └───┬──────┬───────┘                                 │
│      │      │                                         │
│  ┌───┴──┐ ┌─┴────┐                                   │
│  │  S3  │ │ ALB  │                                   │
│  │Static│ │→ API │                                   │
│  └──────┘ └──────┘                                   │
└──────────────────────────────────────────────────────┘
```

### E.2 LLD — Cache Key and Invalidation Logic

```java
public class CDNManager {
    private final CDNClient cdn;
    private final ObjectStorageClient origin;
    private final PrivateKey signingKey;

    public CDNManager(CDNClient cdn, ObjectStorageClient origin, PrivateKey signingKey) {
        this.cdn = cdn; this.origin = origin; this.signingKey = signingKey;
    }

    /** Upload with cache-busting hash in filename */
    public String uploadAsset(String key, byte[] content, String contentType) {
        String contentHash = md5Hex(content).substring(0, 8);
        int dotIdx = key.lastIndexOf('.');
        String versionedKey = key.substring(0, dotIdx) + "." + contentHash + key.substring(dotIdx);
        origin.put(versionedKey, content, contentType,
                   "public, max-age=31536000, immutable");
        return versionedKey;
    }

    /** Purge specific paths from CDN cache */
    public void invalidate(List<String> paths) {
        cdn.createInvalidation(paths);
        // CloudFront: 1-5 min, Fastly: <1s
    }

    /** Generate signed URL for private content */
    public String getSignedUrl(String key, int expiresInSec) {
        long expiry = System.currentTimeMillis() / 1000 + expiresInSec;
        return cdn.generateSignedUrl(key, expiry, signingKey);
    }
}
```

---

## F. Summary & Practice

### Key Takeaways

1. **CDN** = geographically distributed cache for content delivery
2. Reduces latency from 200ms+ to <20ms for cached content
3. **Pull CDN**: lazy fetch on first request; **Push CDN**: proactive upload
4. Cache invalidation: TTL, cache-busting hashes, purge API, stale-while-revalidate
5. CDNs also provide **DDoS protection**, **SSL termination**, and **compression**
6. Use for **static assets, images, video, JS/CSS bundles**; not for personalized content
7. CloudFront, Cloudflare, and Akamai are the top providers
8. **Cache-busting with hashed filenames** is the best invalidation strategy

### Interview Questions

1. What is a CDN and how does it improve performance?
2. Compare push and pull CDN models.
3. How do you handle cache invalidation?
4. When should you NOT use a CDN?
5. How would you serve user-uploaded images globally?
6. What is stale-while-revalidate?
7. How does a CDN reduce origin server load?

### Practice Exercises

1. Design a CDN strategy for a news website with 10M daily users across 5 continents. Include TTLs for different content types.
2. Calculate the cost savings of using CloudFront vs serving 5 TB/month directly from S3.
3. Design the image upload and serving pipeline for a social media app using CDN + S3 + image resizing.

---

> **Previous**: [14 — API Gateway](14-api-gateway.md)
> **Next**: [16 — Caching](16-caching.md)
