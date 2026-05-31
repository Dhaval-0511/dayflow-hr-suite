-- Dayflow HRMS Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  login_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','hr','employee')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar TEXT,
  job_position TEXT,
  department TEXT,
  manager TEXT,
  location TEXT,
  phone TEXT,
  year_of_joining INT,
  serial_number INT,
  date_of_birth TEXT,
  residing_address TEXT,
  nationality TEXT,
  personal_email TEXT,
  gender TEXT,
  marital_status TEXT,
  date_of_joining TEXT,
  emp_code TEXT,
  account_number TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  pan_no TEXT,
  uan_no TEXT,
  about TEXT,
  what_i_love TEXT,
  hobbies TEXT,
  skills TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  monthly_wage DECIMAL(12,2) DEFAULT 0,
  working_days_per_week INT DEFAULT 5,
  break_time_hrs DECIMAL(4,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  work_hours DECIMAL(5,2),
  extra_hours DECIMAL(5,2),
  status TEXT DEFAULT 'absent' CHECK (status IN ('present','absent','leave','half-day')),
  UNIQUE(employee_id, date)
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Paid Time Off','Sick Leave','Unpaid Leave')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  remarks TEXT,
  attachment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave allocations
CREATE TABLE IF NOT EXISTS leave_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  paid_leave INT DEFAULT 24,
  sick_leave INT DEFAULT 7,
  unpaid_leave INT DEFAULT 999,
  UNIQUE(employee_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
