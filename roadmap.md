# Tutrly Development Roadmap 🚀

This document outlines the strategic plan to evolve **Tutrly** from a static landing page into a fully-fledged, scalable EdTech platform connecting home tutors with students and parents.

---

## Phase 1: Foundation & Authentication 🏗️
*Goal: Establish multiple pages and secure user accounts.*

* **Client-Side Routing:** Implement `react-router-dom` to handle navigation between multiple pages (Home, Search, Login, Dashboard, etc.) without reloading the page.
* **Component Architecture:** Break down the current `App.jsx` into smaller, reusable UI components (e.g., `<Navbar />`, `<Hero />`, `<TutorCard />`).
* **User Authentication:** Integrate a backend service (like Firebase Auth or Supabase) to allow users to sign up and log in.
* **Role-Based Accounts:** Differentiate between **Tutor** accounts and **Parent/Student** accounts, redirecting them to their respective tailored dashboards upon login.

## Phase 2: Database & Core Features 🗄️
*Goal: Make the platform data-driven so users can interact with real information.*

* **Tutor Profiles Database:** Create a real-time database (using Firestore, Supabase, or MongoDB) to store tutor profiles, subjects taught, classes, hourly rates, and bios.
* **Advanced Search & Filtering:** Upgrade the hero search bar to query the database. Add filters for geographic location (e.g., "Tutors within 5km"), price range, and availability.
* **Booking & Scheduling System:** Allow parents to click "Book Demo" on a tutor's profile and select a time slot using a calendar integration (like `react-big-calendar` or Calendly API).

## Phase 3: Communication & Transactions 💬
*Goal: Facilitate seamless interaction and business operations.*

* **In-App Messaging:** Implement a real-time chat system allowing parents to message tutors directly before booking.
* **Payment Gateway Integration:** Integrate Stripe or Razorpay to securely process tuition fees or platform commission fees.
* **Virtual Classrooms (Optional):** While Tutrly is for *home* tutors, adding a fallback WebRTC video-call feature (via Agora or Daily.co) for remote demo classes adds massive value.

## Phase 4: Trust & Analytics 📈
*Goal: Build platform credibility and track student success.*

* **Review & Rating System:** Allow parents to leave verified reviews and 1-5 star ratings for tutors after completing a certain number of sessions.
* **Progress Tracking Dashboard:** A specialized UI where tutors can upload weekly progress reports, test scores, or notes for the parents to review.
* **Admin Dashboard:** A private dashboard for you (the platform owner) to monitor user signups, resolve disputes, and track revenue.

---
> [!TIP]
> **Next Steps:** The best place to start is **Phase 1**. We can begin by installing `react-router-dom` and breaking our beautiful UI into reusable components. Just let me know if you are ready to start!
