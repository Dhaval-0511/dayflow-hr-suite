# 🗓️ Dayflow HRMS — Human Resource Management System

> Every workday, perfectly aligned.

A full-stack HRMS built with **React + TypeScript** (frontend) and **Node.js + Express + PostgreSQL** (backend).

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

---

### 1. Database Setup

```bash
# Option A: Using psql as postgres superuser
psql -U postgres -f scripts/create_db.sql

# Option B: Manual
psql -U postgres
CREATE USER hrms_user WITH PASSWORD 'hrms_pass';
CREATE DATABASE hrms_db OWNER hrms_user;
GRANT ALL PRIVILEGES ON DATABASE hrms_db TO hrms_user;
\q
```

---

### 2. Backend Setup

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env if needed (default works with the DB above)

# Install dependencies
npm install

# Start server
node src/index.js
# Backend runs at http://localhost:5000
```

The backend **auto-creates tables and seeds demo data** on first run.

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local (optional, defaults to localhost:5000)
echo "VITE_API_URL=http://localhost:5000/api" > .env.local

# Start dev server
npx vite
# Frontend runs at http://localhost:5173
```

---

## 🔐 Demo Credentials

| Role       | Login ID / Email              | Password   |
|------------|-------------------------------|------------|
| **Admin**  | `admin@odooindia.com`         | `Admin@123`|
| **HR**     | `hr@odooindia.com`            | `HR@12345` |
| **Employee** | `john.doe@odooindia.com`    | `Pass@1234`|
| **Employee** | `jane.smith@odooindia.com`  | `Pass@5678`|

> **Note:** The Sign Up page creates a new company + admin. Individual employees are created by Admin/HR from the Dashboard.

---

## 📁 Project Structure

```
dayflow-hrms/
├── frontend/                    # React + TypeScript (Vite)
│   └── src/
│       ├── pages/
│       │   ├── Auth.tsx          # Sign In / Sign Up
│       │   ├── Dashboard.tsx     # Employee grid + Check In/Out
│       │   ├── Profile.tsx       # Employee profile (Resume, Private Info, Salary, Security)
│       │   ├── Attendance.tsx    # Daily attendance view
│       │   ├── Leave.tsx         # Time-off management
│       │   ├── Payroll.tsx       # Salary view
│       │   ├── Reports.tsx       # Admin analytics
│       │   └── Notifications.tsx
│       ├── components/
│       │   ├── layout/           # Header, Sidebar, Layout
│       │   └── ui/               # shadcn/ui components
│       ├── contexts/
│       │   └── AuthContext.tsx   # JWT auth state
│       └── lib/
│           ├── api.ts            # All API calls
│           └── utils.ts
│
├── backend/                     # Node.js + Express
│   └── src/
│       ├── db/
│       │   ├── index.js          # Pool + auto-init + seed
│       │   └── schema.sql        # PostgreSQL schema
│       ├── middleware/
│       │   └── auth.js           # JWT middleware
│       ├── routes/
│       │   ├── auth.js           # Sign in/up, me, change-password
│       │   ├── employees.js      # CRUD employees
│       │   ├── attendance.js     # Check-in/out, records
│       │   ├── leave.js          # Leave requests + approvals
│       │   ├── payroll.js        # Salary data
│       │   ├── notifications.js  # User notifications
│       │   └── reports.js        # Admin reports
│       └── index.js              # Express app entry
│
└── scripts/
    └── create_db.sql             # DB creation script
```

---

## ✅ Features

### Authentication
- [x] Sign In with Login ID or Email
- [x] Sign Up (creates company + admin)
- [x] Auto-generated employee Login IDs (`ABBR` + `Initials` + `Year` + `Serial`)
- [x] Auto-generated passwords for new employees
- [x] JWT-based session management
- [x] Change password

### Role-Based Access
- [x] **Admin/HR**: Full access — create/edit employees, approve leave, view all attendance, salary management
- [x] **Employee**: View own profile, attendance, apply leave, view own salary

### Employee Management (Admin/HR)
- [x] Employee card grid with status indicators (Present 🟢 / Leave ✈ / Absent 🟡)
- [x] Add employee with auto-generated credentials
- [x] Employee profile: Resume tab, Private Info tab, Salary Info tab (admin only), Security tab
- [x] Edit profile (admin: all fields; employee: personal fields)
- [x] Skills and certifications management

### Attendance
- [x] Check In / Check Out with live timer
- [x] Work hours + extra hours calculation
- [x] Admin: day-wise view of all employees
- [x] Employee: personal monthly attendance with stats

### Time-Off / Leave
- [x] Apply for Paid Time Off, Sick Leave, Unpaid Leave
- [x] Attachment support for sick leave
- [x] Admin: approve/reject with comments
- [x] Leave allocation management (admin can set limits)
- [x] Approved leave auto-marks attendance as "leave"
- [x] Employee sees only own leaves; Admin/HR see all

### Payroll (Salary)
- [x] Auto-calculated salary components from monthly wage:
  - Basic (50%), HRA (50% of basic), Standard Allowance (16.67%)
  - Performance Bonus (8.33%), LTA (8.33%), Fixed Allowance
  - PF Employee/Employer (12% each), Professional Tax (₹200)
- [x] Employee view: read-only
- [x] Admin view: edit wage

### Notifications
- [x] Real-time notifications (polls every 30s)
- [x] Leave request alerts for admin/HR
- [x] Leave approval/rejection alerts for employee
- [x] Mark as read / Mark all read

### Reports (Admin/HR)
- [x] Summary dashboard: total employees, present today, pending leaves
- [x] Monthly attendance table

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signin` | Sign in |
| POST | `/api/auth/signup` | Register company + admin |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |
| GET | `/api/employees` | List all employees |
| GET | `/api/employees/:id` | Get employee |
| POST | `/api/employees` | Create employee (admin) |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee (admin) |
| GET | `/api/attendance` | Get attendance records |
| GET | `/api/attendance/today` | Today's record |
| POST | `/api/attendance/checkin` | Check in |
| POST | `/api/attendance/checkout` | Check out |
| GET | `/api/leave` | Get leave requests |
| POST | `/api/leave` | Create leave request |
| PUT | `/api/leave/:id/status` | Approve/reject (admin) |
| GET | `/api/leave/allocations` | Leave balance |
| PUT | `/api/leave/allocations/:empId` | Update allocation (admin) |
| GET | `/api/payroll` | Payroll data |
| PUT | `/api/payroll/:empId` | Update wage (admin) |
| GET | `/api/notifications` | Get notifications |
| PUT | `/api/notifications/:id/read` | Mark read |
| PUT | `/api/notifications/mark-all-read` | Mark all read |
| GET | `/api/reports` | Reports summary (admin) |

---

## 🛡️ Security Notes

- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens expire in 7 days
- Role-based middleware on all protected routes
- Employees can only see their company's data
- Change `JWT_SECRET` in `.env` for production
