// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('hrms_token');

const request = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('hrms_token');
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  // Auth
  signIn: (loginId: string, password: string) =>
    request('/auth/signin', { method: 'POST', body: JSON.stringify({ loginId, password }) }),
  signUp: (data: Record<string, unknown>) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Employees
  getEmployees: () => request('/employees'),
  getEmployee: (id: string) => request(`/employees/${id}`),
  createEmployee: (data: Record<string, unknown>) =>
    request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Record<string, unknown>) =>
    request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    request(`/employees/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/attendance${qs}`);
  },
  getTodayAttendance: () => request('/attendance/today'),
  checkIn: () => request('/attendance/checkin', { method: 'POST' }),
  checkOut: () => request('/attendance/checkout', { method: 'POST' }),

  // Leave
  getLeave: () => request('/leave'),
  createLeave: (data: Record<string, unknown>) =>
    request('/leave', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, status: string, adminComment?: string) =>
    request(`/leave/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, adminComment }) }),
  getLeaveAllocations: () => request('/leave/allocations'),
  updateLeaveAllocation: (empId: string, data: Record<string, unknown>) =>
    request(`/leave/allocations/${empId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Payroll
  getPayroll: () => request('/payroll'),
  updatePayroll: (empId: string, data: Record<string, unknown>) =>
    request(`/payroll/${empId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/mark-all-read', { method: 'PUT' }),

  // Reports
  getReports: () => request('/reports'),

  // Upload (Cloudinary)
  uploadFile: async (file: File, folder = 'hrms/uploads'): Promise<{ url: string; publicId: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  // Admin (Super Admin only)
  getCompanies: () => request('/admin/companies'),
  toggleCompany: (id: string) => request(`/admin/companies/${id}/toggle`, { method: 'PUT' }),
  getAuditLogs: (page = 1) => request(`/admin/audit-logs?page=${page}`),
  getSystemStats: () => request('/admin/stats'),
};

export type Employee = {
  id: string;
  loginId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'hr' | 'employee';
  firstName: string;
  lastName: string;
  avatar?: string;
  jobPosition?: string;
  department?: string;
  managerId?: string;
  location?: string;
  phone?: string;
  companyId?: string;
  companyName?: string;
  companyAbbr?: string;
  companyLogo?: string;
  yearOfJoining?: number;
  serialNumber?: number;
  dateOfBirth?: string;
  residingAddress?: string;
  nationality?: string;
  personalEmail?: string;
  gender?: string;
  maritalStatus?: string;
  dateOfJoining?: string;
  empCode?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  panNo?: string;
  uanNo?: string;
  about?: string;
  whatILove?: string;
  hobbies?: string;
  skills?: string[];
  certifications?: string[];
  monthlyWage?: number;
  workingDaysPerWeek?: number;
  breakTimeHrs?: number;
  createdAt?: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workHours?: number;
  extraHours?: number;
  status: string;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  remarks?: string;
  attachment?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  createdAt: string;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
};

export type LeaveAllocation = {
  employeeId: string;
  employeeName?: string;
  paidLeave: number;
  sickLeave: number;
  unpaidLeave: number;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
};

export const computeSalaryComponents = (wage: number) => {
  const basic = wage * 0.5;
  const hra = basic * 0.5;
  const perf = basic * 0.0833;
  const lta = basic * 0.0833;
  const standardAllowance = wage * 0.1667;
  const fixed = Math.max(0, wage - basic - hra - perf - lta - standardAllowance);
  const employeePf = basic * 0.12;
  const employerPf = basic * 0.12;
  const profTax = 200;
  const gross = basic + hra + perf + lta + standardAllowance + fixed;
  const netPay = gross - employeePf - profTax;

  return {
    basic, hra, standardAllowance, perf, lta, fixed,
    employeePf, employerPf, profTax, gross, netPay,
    basicPct: 50, hraPct: 50, perfPct: 8.33, ltaPct: 8.33,
    empPfPct: 12, empRPfPct: 12, standardAllowancePct: 16.67,
    fixedPct: wage > 0 ? (fixed / wage) * 100 : 0,
  };
};
