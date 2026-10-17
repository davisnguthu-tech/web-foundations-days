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

## 4. Component Definitions

- **CDN (Content Delivery Network):** Serves cached photos, thumbnails, and static app assets from geographic edge servers close to users to minimize latency and offload bandwidth[cite: 1].
- **Load Balancer:** Distributes incoming HTTPS traffic across available application servers to prevent single-server overload and perform health checks[cite: 1].
- **App Servers (Stateless):** Executes application logic, validates authentication, coordinates database requests, and manages upload pipelines[cite: 1].
- **Cache (Redis):** Stores recent user feeds and frequently queried metadata in memory to deliver sub-millisecond response times and reduce database read traffic[cite: 1].
- **Primary Database:** Handles all data writes (user profiles, photo metadata, follow relations) and enforces transactional ACID compliance[cite: 1].
- **Read Replicas:** Replicates data from the primary database to serve read-only feed queries and user profile lookups[cite: 1].
- **Object Storage:** Stores unstructured binary photo and thumbnail files reliably at high scale and low cost[cite: 1].
- **Message Queue:** Accepts asynchronous processing jobs (e.g., thumbnail generation) from application servers so client requests complete without waiting[cite: 1].
- **Worker Server:** Consumes jobs from the message queue in the background to fetch original photos, render 50 KB thumbnails, and upload them to Object Storage[cite: 1].

---

## 5. Step-by-Step Photo Upload Flow

1. **Client Request:** The user selects a 2 MB photo and submits a `POST /photos` request[cite: 1].
2. **Load Balancing:** The Load Balancer accepts the HTTP request and routes it to an available, healthy App Server[cite: 1].
3. **Binary Storage:** The App Server streams the raw 2 MB photo file directly into Object Storage, which returns a unique file key/URL[cite: 1].
4. **Metadata Record:** The App Server writes a new record into the Primary Database (containing `photo_id`, `user_id`, `photo_url`, `created_at`)[cite: 1].
5. **Asynchronous Task Enqueue:** The App Server pushes a job payload (`{photo_id, photo_url}`) to the Message Queue for thumbnail processing[cite: 1].
6. **Immediate Response:** The App Server responds immediately to the user client with HTTP status `201 Created`[cite: 1].
7. **Background Thumbnail Processing:**
   - A Worker Server pulls the job from the Message Queue[cite: 1].
   - The Worker downloads the 2 MB original photo from Object Storage[cite: 1].
   - The Worker resizes the photo into a 50 KB thumbnail[cite: 1].
   - The Worker uploads the 50 KB thumbnail back into Object Storage[cite: 1].
   - The Worker updates the photo's record in the Primary Database with the new `thumbnail_url`[cite: 1].

---

## 6. Architectural Trade-Offs

1. **Eventual Consistency vs. Real-Time Processing (Thumbnail Queue)**
   - _Trade-off:_ By delegating thumbnail generation to an asynchronous Message Queue and Worker pool, the upload API responds almost instantly to the user[cite: 1]. However, there is a short window of eventual consistency where a user's feed may display a fallback image or placeholder for a few seconds until the worker finishes creating the thumbnail[cite: 1].
2. **Stale Cache Data vs. Database Load Reduction (Feed Caching)**
   - _Trade-off:_ Caching feed pages in Redis allows SnapShare to serve 2,500 peak reads/sec with low latency and minimal database load[cite: 1]. However, if a user uploads a new photo or follows a new account, cached feeds may show slightly stale content until the user's cache key is explicitly invalidated or its TTL expires[cite: 1].
```
