# Tutrly Scalability Report
**Date:** October 2026
**Current Phase:** MVP (Minimum Viable Product)

This report analyzes the current React + Firebase architecture of Tutrly to identify bottlenecks that will occur as the platform grows from 100 users to 10,000+ users. 

Currently, the app is perfectly optimized for **speed of development** and **MVP validation**. However, before undertaking a massive marketing push, several architectural changes will be required to keep costs low and performance high.

---

## 1. Database (Firestore) Bottlenecks & Costs

Firebase Firestore charges based on the **number of document reads**, not the amount of data transferred. The current architecture uses "Client-Side Filtering," which is dangerous at scale.

### The Problem: O(N) Reads
Currently, in `/search` and `/admin`, the app fetches **all** users and **all** bookings from the database, and then filters them in the browser (e.g., checking distances, matching subjects).
*   **At 100 Tutors:** A parent searching for a tutor costs 100 reads. Negligible.
*   **At 10,000 Tutors:** A single parent clicking the "Search" page costs 10,000 reads. If 100 parents search in one day, that is **1,000,000 document reads** ($0.60 per day). 
*   **At Scale:** Your database bill will skyrocket exponentially, and the app will become very slow to load.

### The Solution: Server-Side Querying & Pagination
*   **Pagination:** The Admin dashboard and Search page must use `limit(20)` and "Load More" buttons to only read 20 documents at a time.
*   **Algolia Integration:** For complex text and array searching (e.g., "Math" + "CBSE" + "Kochi"), you should pipe Firestore data into **Algolia** or use native Firestore compound indexes.

---

## 2. Geospatial (Location) Scaling

### The Problem: Client-Side Haversine
Currently, to find tutors within 5km, the app downloads every single tutor in the database and runs the Haversine math formula in the browser to figure out who is close.
*   **At Scale:** Downloading the GPS coordinates of 50,000 tutors to a mobile phone on a 3G network will freeze the browser and consume massive amounts of data.

### The Solution: GeoHashing
*   Implement **GeoFirestore** or standard GeoHashing. This converts coordinates into a string (e.g., `tdr1v`), allowing you to query Firestore *only* for tutors who share the same geographical prefix. This reduces a 50,000 document read down to ~50 reads.

---

## 3. Data Storage (Images)

### The Problem: Base64 Strings in Firestore
During the MVP phase, cropped profile pictures are saved as `Base64` text strings directly inside the `users` database document.
*   Firestore has a hard limit of **1MB per document**. A high-resolution image string can easily exceed this, causing the profile save to crash.
*   It also drastically bloats the size of the user document, making every single read query heavier and slower.

### The Solution: Firebase Cloud Storage
*   Images should be uploaded to an actual Storage Bucket (Firebase Storage). 
*   Firestore should only save the short URL (e.g., `https://firebasestorage.../profile.jpg`). This keeps the database lean and lightning fast.

---

## 4. Frontend Performance (Vite/React)

### The Problem: Monolithic Bundle
Currently, the Vite build process is throwing a warning: `(!) Some chunks are larger than 500 kB after minification`. 
The entire website (Admin Dashboard, Search, Setup, Cropping Libraries) is bundled into one massive JavaScript file that every user must download when they open the site.

### The Solution: Lazy Loading (Code Splitting)
*   Implement React `lazy()` and `Suspense`. 
*   When a guest visits the Home page, they shouldn't be forced to download the code for the Admin Dashboard or the Image Cropper. Code splitting will cut the initial load time of the app by 60-70%.

---

## Summary & Action Plan

**Is the current setup bad?**
Absolutely not. The current setup is the **gold standard for an MVP**. It allowed you to build a fully functioning GPS-tracked marketplace in record time without over-engineering.

**When should you fix these?**
Do **not** fix these right now. Launch the app, get your first 100 tutors and 100 parents, and prove the business model works. 

Once you hit **~500 total users**, you should execute this Scaling Phase:
1. Move profile pictures to Firebase Storage.
2. Implement Pagination on the Search and Admin pages.
3. Implement `lazy()` loading in `App.jsx` to fix the 500kb chunk warning.
4. Add GeoHashing for location queries.
