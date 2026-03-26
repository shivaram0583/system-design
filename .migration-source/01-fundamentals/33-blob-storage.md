# Topic 33: Blob Storage

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–32

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

### What is Blob Storage?

**Blob (Binary Large Object) Storage** is a service for storing unstructured data — files, images, videos, backups, logs — as objects rather than in rows/columns. Each object has a unique key, the data itself, and metadata.

```
RELATIONAL DB:              BLOB/OBJECT STORAGE:
  Rows + Columns              Key + Data + Metadata
  Structured data             Unstructured data
  SQL queries                 GET/PUT by key
  Max ~1 GB per field         Objects up to 5 TB
  Expensive per GB            Cheap per GB ($0.023/GB/month S3)
```

### Object Storage Model

```
  Bucket: my-app-uploads
    │
    ├── images/profile/user_123.jpg    (200 KB)
    ├── images/profile/user_456.jpg    (150 KB)
    ├── videos/upload_789.mp4          (500 MB)
    ├── backups/db_2024_01_15.sql.gz   (2 GB)
    └── logs/2024/01/15/app.log.gz     (50 MB)

  Each object:
    Key:      "images/profile/user_123.jpg"
    Data:     Binary content (the actual image)
    Metadata: Content-Type, size, upload date, custom headers
    URL:      https://my-app-uploads.s3.amazonaws.com/images/profile/user_123.jpg
```

### Object Storage Providers

| Provider | Service | Durability | Cost (Standard) |
|----------|---------|-----------|----------------|
| **AWS** | S3 | 99.999999999% (11 nines) | $0.023/GB/month |
| **Google Cloud** | Cloud Storage | 99.999999999% | $0.020/GB/month |
| **Azure** | Blob Storage | 99.999999999% | $0.018/GB/month |
| **MinIO** | Self-hosted (S3-compatible) | Configurable | Infrastructure cost |
| **Cloudflare** | R2 | 99.999999999% | $0.015/GB/month, no egress fees |

### Storage Classes (S3 Example)

| Class | Access | Cost/GB/month | Retrieval | Use Case |
|-------|--------|-------------|-----------|----------|
| **Standard** | Frequent | $0.023 | Instant | Active data, serving content |
| **Infrequent Access** | Monthly | $0.0125 | Instant + retrieval fee | Backups, older data |
| **Glacier Instant** | Quarterly | $0.004 | Milliseconds | Archive with instant access |
| **Glacier Flexible** | Yearly | $0.0036 | Minutes to hours | Long-term archive |
| **Glacier Deep** | Rarely | $0.00099 | 12-48 hours | Compliance, 7-year retention |

### Pre-Signed URLs

```
Problem: Client needs to upload/download files directly to/from S3,
         but S3 bucket is private.

Solution: Server generates a pre-signed URL with temporary access.

  UPLOAD flow:
  1. Client → Server: "I want to upload profile_pic.jpg"
  2. Server generates pre-signed PUT URL (valid 15 min)
  3. Server → Client: "PUT to this URL: https://s3.../user_123.jpg?signature=abc&expires=..."
  4. Client → S3: PUT file directly (no server bandwidth used!)
  5. Client → Server: "Upload complete, here's the key"
  6. Server saves key in database

  DOWNLOAD flow:
  1. Client → Server: "I need user_123's profile pic"
  2. Server generates pre-signed GET URL (valid 1 hour)
  3. Server → Client: "GET from this URL: https://s3.../user_123.jpg?signature=xyz"
  4. Client → S3: GET file directly

  Benefits:
  • Server doesn't handle file bytes (saves bandwidth + CPU)
  • Temporary access (expires after N minutes)
  • Client uploads/downloads at S3 speed, not server speed
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows to store files in S3, not in the database |
| **Mid** | Pre-signed URLs, storage classes, CDN integration |
| **Senior** | Lifecycle policies, multipart upload, cross-region replication |
| **Staff+** | Cost optimization, compliance (encryption, retention), data lake architecture |

### Red Flags

- Storing images/files as BLOBs in the database
- Not using pre-signed URLs (routing all traffic through the server)
- Not considering CDN for serving static content

### Common Questions

1. Where would you store user-uploaded images?
2. How do you handle large file uploads?
3. What are pre-signed URLs?
4. How do you optimize blob storage costs?
5. How do you serve files globally with low latency?

---

## C. Practical Engineering View

### Multipart Upload

```
For large files (>100 MB), upload in parts:

  1. Initiate multipart upload → get upload_id
  2. Upload parts (each 5-100 MB) in parallel
     Part 1: bytes 0-50MB       → ETag: "abc"
     Part 2: bytes 50-100MB     → ETag: "def"
     Part 3: bytes 100-150MB    → ETag: "ghi"
  3. Complete upload: send list of parts + ETags
  4. S3 assembles parts into final object

  Benefits:
  • Parallel upload (faster)
  • Retry individual parts (not entire file)
  • Resume interrupted uploads
  • No single request size limit
```

### Lifecycle Policies

```
Automate cost optimization:

  Rule 1: Move to Infrequent Access after 30 days
  Rule 2: Move to Glacier after 90 days
  Rule 3: Delete after 365 days

  S3 Lifecycle config:
  {
    "Rules": [{
      "ID": "archive-old-uploads",
      "Status": "Enabled",
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "Expiration": {"Days": 365}
    }]
  }

  Cost impact for 10 TB:
    All Standard: $230/month
    With lifecycle: ~$80/month (65% savings)
```

---

## D. Example: Image Upload Service

```
┌────────┐  1. Request upload URL  ┌──────────┐
│ Client │────────────────────────►│  API     │
│        │◄────────────────────────│  Server  │
│        │  2. Pre-signed PUT URL  │          │
│        │                          └──────────┘
│        │  3. PUT image directly
│        │─────────────────────────►┌──────────┐
│        │                          │   S3     │
└────────┘                          │  Bucket  │
                                    └────┬─────┘
                                         │ S3 Event
                                    ┌────┴─────┐
                                    │ Lambda   │ 4. Resize image
                                    │ (resize) │    (thumb, medium, large)
                                    └────┬─────┘
                                         │ Save variants
                                    ┌────┴─────┐
                                    │   S3     │
                                    │ (output) │
                                    └────┬─────┘
                                         │
                                    ┌────┴─────┐
                                    │CloudFront│ 5. Serve via CDN
                                    │  (CDN)   │
                                    └──────────┘
```

---

## E. HLD and LLD

### E.1 HLD — File Storage Architecture

```
┌──────────────────────────────────────────────────────┐
│  Client                                                │
│    │ upload                    │ download               │
│    ▼                          ▼                        │
│  ┌──────────┐           ┌──────────┐                  │
│  │ API Svc  │           │ CDN      │ (cache + serve)  │
│  │ (signed  │           │CloudFront│                   │
│  │  URLs)   │           └────┬─────┘                  │
│  └────┬─────┘                │ origin                  │
│       │                      │                         │
│  ┌────┴──────────────────────┴─────┐                  │
│  │  S3 Bucket                       │                  │
│  │  /uploads/raw/    (original)     │                  │
│  │  /uploads/thumb/  (200px)        │                  │
│  │  /uploads/medium/ (800px)        │                  │
│  │  /uploads/large/  (1920px)       │                  │
│  └──────────────────────────────────┘                  │
│                                                        │
│  Metadata DB (PostgreSQL):                            │
│    files (id, user_id, s3_key, size, content_type,    │
│           upload_status, created_at)                   │
│                                                        │
│  Processing: S3 Event → Lambda → resize + virus scan  │
│  Lifecycle: Standard → IA (30d) → Glacier (90d)       │
└──────────────────────────────────────────────────────┘
```

### E.2 LLD — Upload Service

```python
import boto3
import uuid

class FileUploadService:
    def __init__(self, s3_client, db, bucket: str, cdn_domain: str):
        self.s3 = s3_client
        self.db = db
        self.bucket = bucket
        self.cdn = cdn_domain

    def request_upload(self, user_id: str, filename: str,
                      content_type: str, size_bytes: int) -> dict:
        # Validate
        if size_bytes > 50 * 1024 * 1024:  # 50 MB limit
            raise ValueError("File too large. Use multipart upload.")
        
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if content_type not in allowed_types:
            raise ValueError(f"Unsupported type: {content_type}")

        # Generate unique key
        file_id = str(uuid.uuid4())
        ext = filename.rsplit(".", 1)[-1]
        s3_key = f"uploads/raw/{user_id}/{file_id}.{ext}"

        # Save metadata
        self.db.execute(
            "INSERT INTO files (id, user_id, s3_key, size, content_type, status) "
            "VALUES (%s, %s, %s, %s, %s, 'pending')",
            (file_id, user_id, s3_key, size_bytes, content_type)
        )

        # Generate pre-signed PUT URL
        presigned_url = self.s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=900,  # 15 minutes
        )

        return {"file_id": file_id, "upload_url": presigned_url, "key": s3_key}

    def confirm_upload(self, file_id: str, user_id: str):
        """Called after client completes upload"""
        file = self.db.get("SELECT * FROM files WHERE id = %s AND user_id = %s",
                          (file_id, user_id))
        # Verify file exists in S3
        self.s3.head_object(Bucket=self.bucket, Key=file["s3_key"])
        
        self.db.execute("UPDATE files SET status = 'uploaded' WHERE id = %s", (file_id,))
        # Trigger async processing (resize, virus scan)
        return {"status": "uploaded", "url": f"https://{self.cdn}/{file['s3_key']}"}

    def get_download_url(self, file_id: str) -> str:
        file = self.db.get("SELECT s3_key FROM files WHERE id = %s", (file_id,))
        return f"https://{self.cdn}/{file['s3_key']}"
```

---

## F. Summary & Practice

### Key Takeaways

1. **Blob/Object storage** (S3, GCS, Azure Blob) for files, images, videos — not a database
2. **Never store files in the database** — use object storage + metadata in DB
3. **Pre-signed URLs** let clients upload/download directly to S3 (offload server)
4. **Multipart upload** for large files (parallel, resumable)
5. **Storage classes** reduce costs: Standard → IA → Glacier (lifecycle policies)
6. Serve via **CDN** (CloudFront) for global low-latency access
7. **11 nines durability** — S3 won't lose your data
8. Process uploads asynchronously (resize, virus scan, thumbnail)

### Interview Questions

1. Where would you store user-uploaded files?
2. What are pre-signed URLs and why use them?
3. How do you handle large file uploads (>1 GB)?
4. How do you optimize storage costs?
5. How do you serve files globally with low latency?
6. Design an image upload and serving pipeline.
7. How do you handle file deletions and retention?

### Practice Exercises

1. **Exercise 1**: Design the file storage architecture for a cloud document editor (like Google Docs). Handle: upload, versioning, sharing, real-time collaboration.
2. **Exercise 2**: Your S3 bill is $50K/month for 2 PB of data. Design a lifecycle policy to reduce it by 60%.
3. **Exercise 3**: Implement a video upload service with multipart upload, progress tracking, and transcoding pipeline.

---

> **Previous**: [32 — Full-Text Search](32-full-text-search.md)
> **Next**: [34 — Stream Processing](34-stream-processing.md)
