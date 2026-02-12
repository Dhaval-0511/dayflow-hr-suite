# DayFlow – Human Resource Management System 💼

**“Every workday, perfectly aligned.”**

DayFlow is a role-based Human Resource Management System (HRMS) designed to digitize and streamline core HR operations including employee management, attendance tracking, leave workflows, and payroll visibility.

---

## 📌 Problem Statement

Many small and mid-sized organizations rely on spreadsheets and disconnected tools to manage HR operations.  
This leads to:

- Manual errors in attendance and payroll
- Delayed leave approvals
- Lack of centralized employee data
- Poor transparency between HR and employees

DayFlow solves this by providing a centralized, structured, and permission-controlled HR platform.

---

## 💡 Solution Overview

DayFlow provides:

- Secure authentication system
- Role-based dashboards (Admin vs Employee)
- Attendance tracking with status control
- Structured leave approval workflows
- Controlled payroll visibility
- Employee profile management

The system ensures strict access control while maintaining usability for both HR and employees.

---

## 🏗️ System Architecture

### 🔐 Authentication & Authorization
- Sign Up using Employee ID, Email, Password, Role
- Email verification required
- Secure login with error handling
- Role-based access control (RBAC)

---

## 👥 User Roles

### Admin / HR Officer
- Manage employee records
- Approve/reject leave requests
- View all attendance records
- Update payroll structures
- Monitor organization-wide data

### Employee
- View and update profile (limited fields)
- Check-in / Check-out attendance
- Apply for leave
- View salary details (read-only)

---

## 📊 Core Modules

### 🖥️ Dashboard

#### Employee Dashboard
- Profile
- Attendance
- Leave Requests
- Recent activity alerts

#### Admin Dashboard
- Employee directory
- Attendance records
- Leave approval system
- Payroll control access

---

### 📁 Employee Profile Management

Employees can view:
- Personal details
- Job details
- Salary structure
- Uploaded documents
- Profile picture

Editing Permissions:
- Employees → Limited fields
- Admin → Full access

---

### 🕒 Attendance Management

- Daily & weekly attendance views
- Check-in / Check-out functionality
- Attendance statuses:
  - Present
  - Absent
  - Half-day
  - Leave

Access Control:
- Employees → View own attendance
- Admin → View all employee records

---

### 📆 Leave & Time-Off Management

#### Employee
- Select leave type (Paid / Sick / Unpaid)
- Choose date range
- Add remarks
- Track request status:
  - Pending
  - Approved
  - Rejected

#### Admin / HR
- View all leave requests
- Approve or reject with comments
- Instant record updates

---

### 💰 Payroll Management

Employee:
- Read-only salary view

Admin:
- View payroll data
- Update salary structure
- Maintain payroll accuracy

---

## 🛠️ Tech Stack

Frontend:
- React.js
- HTML5
- CSS3
- JavaScript

State & Logic:
- React Hooks
- Role-based conditional rendering

Concepts Applied:
- RBAC (Role-Based Access Control)
- Workflow-based approval system
- Controlled data visibility

---

## 🔗 System Flow Diagram

Excalidraw Design:
https://link.excalidraw.com/l/65VNwvy7c4X/58RLEJ4oOwh

---

## 🎯 Key Highlights

- Role-based architecture
- Structured HR workflows
- Secure authentication system
- Permission-controlled payroll visibility
- Scalable system design

---

## 🚀 Future Enhancements

- Email & notification alerts
- Analytics & reporting dashboard
- Salary slip generation
- Attendance performance insights
- Cloud deployment

---

## 👤 Author

Dhaval Prajapati  
GitHub: https://github.com/Dhaval-0511  
LinkedIn: https://linkedin.com/in/dhaval-prajapati-a62401292
