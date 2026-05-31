# Dayflow HRMS — API Reference

Base URL (local): `http://localhost:5000/api`
Base URL (production): `https://dayflow-hrms-api.onrender.com/api`

---

## Authentication
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/signin` | No | Sign in with email/loginId + password |
| POST | `/auth/signup` | No | Register company + admin account |
| GET | `/auth/me` | Yes | Get current logged-in user |
| PUT | `/auth/change-password` | Yes | Change own password |

## Employees
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/employees` | Yes (Admin/HR) | List all employees |
| GET | `/employees/:id` | Yes | Get single employee |
| POST | `/employees` | Yes (Admin/HR) | Create employee |
| PUT | `/employees/:id` | Yes | Update employee |
| DELETE | `/employees/:id` | Yes (Admin) | Delete employee |

## Attendance
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/attendance` | Yes | Get attendance records |
| GET | `/attendance/today` | Yes | Today's attendance for current user |
| POST | `/attendance/checkin` | Yes | Check in |
| POST | `/attendance/checkout` | Yes | Check out |

## Leave
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/leave` | Yes | Get leave requests |
| POST | `/leave` | Yes | Apply for leave |
| PUT | `/leave/:id/status` | Yes (Admin/HR) | Approve or reject leave |
| GET | `/leave/allocations` | Yes | Get leave balance |
| PUT | `/leave/allocations/:empId` | Yes (Admin) | Update leave allocation |

## Payroll
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/payroll` | Yes | Get payroll data |
| PUT | `/payroll/:empId` | Yes (Admin) | Update monthly wage |
| POST | `/payroll/:empId/payslip` | Yes (Admin) | Generate PDF payslip |

## Notifications
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/notifications` | Yes | Get user notifications |
| PUT | `/notifications/:id/read` | Yes | Mark as read |
| PUT | `/notifications/mark-all-read` | Yes | Mark all as read |

## Reports
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/reports` | Yes (Admin/HR) | Get reports summary |

## System (Super Admin Only)
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/admin/companies` | Super Admin | List all companies |
| GET | `/admin/audit-logs` | Super Admin | View system audit logs |
