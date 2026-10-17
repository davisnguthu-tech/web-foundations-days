# SnapShare System Scaling Plan

## 1. Capacity Estimations & Load Calculations

### Assumptions & Daily Active Users (DAU)

- **Registered Users:** 10,000,000 users
- **Daily Active Percentage:** 10%
- **Daily Active Users (DAU):** 10,000,000 × 0.10 = 1,000,000 DAU
- **User Behavior:** Each DAU uploads 1 photo per day and views 50 feed pages per day.
- **File Sizes:** Average photo size is 2 MB, and each thumbnail is 50 KB (0.05 MB).
- **Time Conversion Rule:** 1 day ≈ 100,000 seconds (standard engineering approximation).
- **Peak Traffic Multiplier:** 5× average traffic.

### Traffic Calculations

#### Uploads per Second (Writes)

- **Total Daily Uploads:** 1,000,000 DAU × 1 photo/day = 1,000,000 uploads/day
- **Average Uploads/sec:** 1,000,000 ÷ 100,000 = 10 uploads/sec
- **Peak Uploads/sec (5×):** 10 × 5 = 50 uploads/sec

#### Feed Views per Second (Reads)

- **Total Daily Feed Views:** 1,000,000 DAU × 50 views/day = 50,000,000 views/day
- **Average Feed Views/sec:** 50,000,000 ÷ 100,000 = 500 feed views/sec
- **Peak Feed Views/sec (5×):** 500 × 5 = 2,500 feed views/sec

### Storage Calculations

#### Photo Data Storage per Year

- **Storage per Upload (Photo + Thumbnail):** 2.00 MB + 0.05 MB = 2.05 MB
- **Daily Storage Added:** 1,000,000 uploads/day × 2.05 MB = 2,050,000 MB ≈ 2,050 GB = 2.05 TB/day
- **Yearly Storage Added:** 2.05 TB/day × 365 days = 748.25 TB/year

## 2. Workload & Storage Architecture Decisions

### Read-Heavy vs. Write-Heavy System Analysis

SnapShare is a **read-heavy system**. The system handles 500 reads/sec compared to only 10 writes/sec on average, meaning reads outnumber writes by a 50:1 ratio.

**Design Implications:**

1.  **Aggressive Read Caching:** Since feed requests dominate traffic, caching hot feed data in an in-memory database like Redis reduces direct database load.
2.  **Read Replicas:** Read queries can be offloaded from the primary database to multiple read replicas to scale read throughput seamlessly.
3.  **CDN Optimization:** Serving photo binaries and thumbnails from CDN edge servers prevents application servers and storage systems from being overwhelmed by image fetching traffic.

### Photo Storage Rationale

Binary image files should **never** be stored directly inside a relational database (e.g., as BLOB types).
**Why Database Storage fails for photos:** Storing large binary files causes massive database file bloat, drastically slowing down index maintenance, backup processes, and query performance.
**Where they belong instead:** Photo binaries are stored in **Object Storage** (e.g., AWS S3), which is designed for durable, highly scalable, cost-effective binary file storage. The relational database stores only the structured metadata and image URLs.

## 3. System Architecture Diagram

```text
                              ┌─────────┐
                   ┌─────────>│   DNS   │  (snapshare.com -> IP)
                   │          └─────────┘
  ┌────────────────┴┐ static files & images  ┌───────────────────────────┐
  │ Browser /       │ ─────────────────────> │  CDN (Edge Cache)         │
  │ Mobile Client   │                        └─────────────┬─────────────┘
  └────────────────┬┘                                      │ miss only
                   │ API calls (HTTPS/JSON)                v
                   v                         ┌───────────────────────────┐
            ┌──────────────┐                 │ Object Storage (S3)       │
            │ Load Balancer│                 │ (Original Photos & Thumbs)│
            └──────┬───────┘                 └─────────────▲─────────────┘
          ┌────────┼────────┐                              │ upload/fetch
          v        v        v                              │
      ┌───────┐┌───────┐┌───────┐                    ┌─────┴───────┐
      │ App 1 ││ App 2 ││ App 3 │ ─────────────────> │ Cache       │
      └───┬───┘└───┬───┘└───┬───┘                    │ (Redis)     │
          │        │        │                        └─────────────┘
          │        │        ├────────────────┐
    writes│        │reads   │ enqueue jobs   │
          v        v        v                v
      ┌────────┐ ┌──────────┐         ┌────────────┐    ┌─────────┐
      │Primary │>│Read      │         │ Message    │───>│ Worker  │
      │   DB   │ │Replicas  │         │ Queue      │    │ Server  │
      └────────┘ └──────────┘         └────────────┘    └─────────┘
```

---

## 4. Component Definitions

- **CDN (Content Delivery Network):** Serves cached photos, thumbnails, and static app assets from geographic edge servers close to users to minimize latency and offload bandwidth.
- **Load Balancer:** Distributes incoming HTTPS traffic across available application servers to prevent single-server overload and perform health checks.
- **App Servers (Stateless):** Executes application logic, validates authentication, coordinates database requests, and manages upload pipelines.
- **Cache (Redis):** Stores recent user feeds and frequently queried metadata in memory to deliver sub-millisecond response times and reduce database read traffic.
- **Primary Database:** Handles all data writes (user profiles, photo metadata, follow relations) and enforces transactional ACID compliance.
- **Read Replicas:** Replicates data from the primary database to serve read-only feed queries and user profile lookups.
- **Object Storage:** Stores unstructured binary photo and thumbnail files reliably at high scale and low cost.
- **Message Queue:** Accepts asynchronous processing jobs (e.g., thumbnail generation) from application servers so client requests complete without waiting.
- **Worker Server:** Worker servers are stateless, background compute instances decoupled via a message queue. They perform CPU-intensive tasks too slow for the synchronous path. They long-poll the thumbnail queue for jobs `{photo_id, s3_url}`, download the original image from Object Storage, generate 3–5 thumbnail sizes (50 KB), upload thumbnails back to Object Storage, update the photo record in Primary DB from `PENDING` to `AVAILABLE`, and delete the job. They auto-scale based on queue depth. If a worker fails, message visibility timeout expires and another worker retries, providing fault tolerance.

---

## 5. Step-by-Step Photo Upload Flow

This design uses direct client-to-object-storage upload to avoid bottlenecking application servers with large binary streams.

1. **Step 1: Request Upload URL**  
   Client -> Load Balancer -> App Server. Client authenticates via `POST /photos/request-upload`. App Server verifies user quota.
2. **Step 2: Reserve Metadata & Get Pre-Signed URL**  
   App Server generates a unique PhotoID (UUID), creates a row in Photos Metadata DB (Primary MySQL) with `user_id`, `photo_id`, `status=PENDING`, and requests a pre-signed PUT URL from S3. It returns PhotoID and URL to client. No binary moved yet.
3. **Step 3: Direct Upload**  
   Client PUTs the full-resolution 2MB JPEG DIRECTLY to S3 using the pre-signed URL. This traffic bypasses our web servers entirely, saving massive ingress/egress bandwidth. S3 returns `200 OK` to client.
4. **Step 4: Commit Upload**  
   Client calls `POST /photos/{id}/commit` to App Server confirming S3 upload success. App Server updates DB to `UPLOADED` and enqueues a thumbnail job to Message Queue.
5. **Step 5: Immediate Client Response**  
   App Server responds with HTTP `201 Created` so user does not wait for image processing.
6. **Step 6: Asynchronous Processing**  
   Worker Server pulls job from queue, downloads original from S3, generates 50KB thumbnail, uploads thumbnail to S3, updates Photos DB record to `AVAILABLE` with thumbnail URLs, and invalidates/warms Redis feed cache.
7. **Step 7: Read Path**  
   All subsequent reads are served from CDN (for images) and Read Replicas + Redis cache (for metadata).

---

## 6. Architectural Trade-Offs

### Trade-off 1: Direct Client-to-S3 Upload vs. Proxying Through Web Servers

- **Option A (Chosen — Direct Upload):**
  - *Pros:* Web servers handle only lightweight JSON payloads instead of multi-MB binary streams. At peak (50 uploads/sec × 2 MB = 100 MB/s ingress), proxying would require 10× more web servers. Direct upload is infinitely scalable and lower latency.
  - *Cons:* Harder to validate image content before storage; requires pre-signed URL logic and client-side retry handling.
- **Option B (Proxying Through Web Servers):**
  - *Pros:* Easy to validate, resize, and reject malicious or invalid files in one place before hitting storage.
  - *Cons:* Web servers become bandwidth and CPU bottlenecks. For SnapShare's scale, handling image fetch + upload traffic would collapse the web tier. Direct upload is mandatory for production.

### Trade-off 2: Synchronous vs. Asynchronous Thumbnail Processing (Immediate Availability vs. Processing Speed)

- **Option A (Chosen — Asynchronous via Workers & Queue):**
  - *Pros:* Upload API returns in <200ms. User gets immediate success. Workers scale independently based on queue depth, and background failures can retry safely without impacting the user experience.
  - *Cons:* Eventual consistency—a 2–5 second window where the original image exists but thumbnails are not yet marked `AVAILABLE`, requiring placeholder/fallback image logic on client feeds.
- **Option B (Synchronous in Request Path):**
  - *Pros:* Strong consistency—when the upload call returns, all thumbnails are guaranteed to exist immediately. Simpler architecture without message queues or worker pools.
  - *Cons:* Upload requests take 2–3 seconds of CPU-intensive resizing, tying up web server threads, causing timeouts and terrible UX at peak loads. Unacceptable at scale.

