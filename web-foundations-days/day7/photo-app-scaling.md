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

---

### Traffic Calculations

#### Uploads per Second (Writes)

- **Total Daily Uploads:** 1,000,000 DAU × 1 photo/day = 1,000,000 uploads/day
- **Average Uploads/sec:** 1,000,000 ÷ 100,000 = 10 uploads/sec
- **Peak Uploads/sec (5×):** 10 × 5 = 50 uploads/sec

#### Feed Views per Second (Reads)

- **Total Daily Feed Views:** 1,000,000 DAU × 50 views/day = 50,000,000 views/day
- **Average Feed Views/sec:** 50,000,000 ÷ 100,000 = 500 feed views/sec
- **Peak Feed Views/sec (5×):** 500 × 5 = 2,500 feed views/sec

---

### Storage Calculations

#### Photo Data Storage per Year

- **Storage per Upload (Photo + Thumbnail):** 2.00 MB + 0.05 MB = 2.05 MB
- **Daily Storage Added:** 1,000,000 uploads/day × 2.05 MB = 2,050,000 MB ≈ 2,050 GB = 2.05 TB/day
- **Yearly Storage Added:** 2.05 TB/day × 365 days = 748.25 TB/year

---

## 2. Workload & Storage Architecture Decisions

### Read-Heavy vs. Write-Heavy System Analysis

SnapShare is a **read-heavy system**. The system handles 500 reads/sec compared to only 10 writes/sec on average, meaning reads outnumber writes by a 50:1 ratio.

**Design Implications:**

1. **Aggressive Read Caching:** Since feed requests dominate traffic, caching hot feed data in an in-memory database like Redis reduces direct database load.
2. **Read Replicas:** Read queries can be offloaded from the primary database to multiple read replicas to scale read throughput seamlessly.
3. **CDN Optimization:** Serving photo binaries and thumbnails from CDN edge servers prevents application servers and storage systems from being overwhelmed by image fetching traffic.

---

### Photo Storage Rationale

Binary image files should **never** be stored directly inside a relational database (e.g., as BLOB types).

**Why Database Storage fails for photos:**

- Storing large binary files causes massive database file bloat, drastically slowing down index maintenance, backup processes, and query performance.
- Databases use memory and CPU inefficiently when streaming multi-megabyte binary streams.

**Where they belong instead:**
Photo binaries are stored in **Object Storage** (e.g., AWS S3 or Google Cloud Storage), which is designed for durable, highly scalable, cost-effective binary file storage. The relational database stores only the structured metadata and image URLs pointing to Object Storage.

---

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

## 4. Component Definitions

- **CDN (Content Delivery Network):** Serves cached photos, thumbnails, and static app assets from geographic edge servers close to users to minimize latency and offload bandwidth.
- **Load Balancer:** Distributes incoming HTTPS traffic across available application servers to prevent single-server overload and perform health checks.
- **App Servers (Stateless):** Executes application logic, validates authentication, coordinates database requests, and manages upload pipelines.
- **Cache (Redis):** Stores recent user feeds and frequently queried metadata in memory to deliver sub-millisecond response times and reduce database read traffic.
- **Primary Database:** Handles all data writes (user profiles, photo metadata, follow relations) and enforces transactional ACID compliance.
- **Read Replicas:** Replicates data from the primary database to serve read-only feed queries and user profile lookups.
- **Object Storage:** Stores unstructured binary photo and thumbnail files reliably at high scale and low cost.
- **Message Queue:** Accepts asynchronous processing jobs (e.g., thumbnail generation) from application servers so client requests complete without waiting.
- **Worker Server:** Consumes background jobs from the message queue to download original photo binaries, generate optimized 50 KB thumbnails, upload rendered thumbnails to Object Storage, and update metadata in the Primary Database.

---

## 5. Step-by-Step Photo Upload Flow

1. **Client Request:** The user selects a 2 MB photo and submits a `POST /photos` HTTP request.
2. **Load Balancing:** The Load Balancer intercepts the incoming HTTPS request and routes it to an available, healthy stateless App Server.
3. **Binary Storage:** The App Server streams the raw 2 MB photo file directly into Object Storage (e.g., AWS S3), which stores the binary asset and returns a unique object key/URL.
4. **Metadata Record:** The App Server writes a new metadata record (`photo_id`, `user_id`, `photo_url`, `created_at`) to the Primary Database.
5. **Asynchronous Task Enqueue:** The App Server publishes a processing payload (`{photo_id, photo_url}`) to the Message Queue for asynchronous background worker processing.
6. **Immediate Client Response:** The App Server responds to the client immediately with HTTP status `201 Created` so the user does not wait for image processing.
7. **Background Thumbnail Processing:**
   - A Worker Server pulls the job from the Message Queue.
   - The Worker downloads the 2 MB original photo binary from Object Storage.
   - The Worker processes and resizes the image into a 50 KB thumbnail.
   - The Worker uploads the 50 KB thumbnail back to Object Storage.
   - The Worker updates the photo's database record in the Primary Database with the generated `thumbnail_url`.

---

## 6. Architectural Trade-Offs

1. **Eventual Consistency vs. Real-Time Processing (Thumbnail Queue)**
   - *Trade-off:* Delegating thumbnail processing to an asynchronous Message Queue gives clients near-instant upload responses. However, it introduces a temporary window of eventual consistency where the feed may display a fallback image or placeholder for a few seconds until the worker completes processing and updates the database record.
2. **Stale Cache Data vs. Database Load Reduction (Feed Caching)**
   - *Trade-off:* Caching user feeds in Redis offloads massive read volume (2,500 peak reads/sec) from the primary database. The trade-off is cache invalidation complexity—users may briefly see stale feeds until their cache key expires or is explicitly invalidated upon a new upload.
