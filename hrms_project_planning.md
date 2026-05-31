# HRMS Project Planning & Strategy

This document summarizes our conversation regarding the architecture, features, and deployment strategy for turning the Dayflow HRMS into a professional-level portfolio project.

## 1. Project Analysis & Current State
**Question:** Why is the folder structure separate, what is implemented, and what is the tech stack?
**Decision/Answer:**
*   **Structure:** It uses a decoupled "Monorepo" architecture. The frontend and backend are kept separate to manage dependencies independently and allow flexible deployment.
*   **Tech Stack:** React + Vite + Tailwind (Frontend) and Node.js + Express + PostgreSQL (Backend).
*   **Currently Implemented:** Authentication (JWT), Role-based access (Admin/Employee), Employee directory, Attendance tracking (check-in/out), Leave management, Payroll calculation, and basic reports.

## 2. Elevating to a Professional Level
**Question:** What other features can I make so that this project is proper professional level?
**Decision/Answer:**
*   **Functional Additions:**
    *   Onboarding/Offboarding workflows.
    *   Organizational Charts & Reporting Lines (Manager roles).
    *   Applicant Tracking System (ATS) for recruitment.
    *   Geofencing/IP restrictions for attendance.
*   **Technical Upgrades:**
    *   Migrate from raw SQL to an ORM (Prisma or Drizzle).
    *   Move file uploads to Cloud Storage (AWS S3, Cloudinary).
    *   Implement real-time WebSockets (Socket.io) instead of polling.
    *   Add Email notifications (Resend/SendGrid).
    *   Implement a strict Audit Log to track who changed what.

## 3. Professional Project Structure
**Question:** Is "client/server" how professional projects are made? What goes into these folders to look good on GitHub?
**Decision/Answer:**
*   Yes, strictly separating UI (Client) from Business Logic (Server) is the industry standard.
*   **Action Plan:**
    1. Rename `frontend` to `client`.
    2. Rename `backend` to `server`.
    3. Update `package.json` scripts to match the new names.
    4. Provide a `.env.example` file so others know what environment variables are needed.
    5. Clean up any accidental folders (like `{frontend,backend}`).
    6. Write a comprehensive `README.md` with setup instructions and screenshots.

## 4. Database & Deployment Strategy
**Question:** PostgreSQL or SQLite? Where to deploy safely and for free? How do I manage the DB as a Super Admin post-deployment?
**Decision/Answer:**
*   **Database:** Absolutely use **PostgreSQL**. SQLite cannot handle the concurrent traffic required for an HRMS.
*   **Deployment Stack:**
    *   **Database:** Neon.tech or Supabase (Free cloud PostgreSQL).
    *   **Backend (Server):** Render.com or Railway.app (Vercel serverless doesn't work well with traditional Node/Express backends).
    *   **Frontend (Client):** Vercel or Netlify.
*   **Super Admin & DB Management:**
    *   Use the connection string provided by Neon.tech in your `.env` file (e.g., `DATABASE_URL`).
    *   Use a GUI tool like **DBeaver** or **TablePlus** on your local computer to connect directly to the production cloud database to manage data without touching the code.
    *   Create a `SUPER_ADMIN` role in the database. Seed your personal email with this role.
    *   Write a `requireSuperAdmin` middleware in Node.js to protect highly sensitive routes (like deleting accounts or viewing system logs).

## Immediate Next Steps to Execute:
1. [ ] Rename folders to `client` and `server`.
2. [ ] Create a free cloud database on Neon.tech.
3. [ ] Connect the local project to the Neon database URL.
4. [ ] Integrate an ORM (Prisma/Drizzle) into the Node backend.
