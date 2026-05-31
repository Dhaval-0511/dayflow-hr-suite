const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hrms_user:hrms_pass@localhost:5432/hrms_db',
});

async function initDb() {
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    
    // Seed demo data
    const { rows: companies } = await client.query('SELECT id FROM companies LIMIT 1');
    if (companies.length === 0) {
      // Create demo company
      const { rows: [company] } = await client.query(
        `INSERT INTO companies (name, abbreviation) VALUES ($1, $2) RETURNING id`,
        ['Odoo India', 'OI']
      );
      const companyId = company.id;

      // Create admin
      const adminHash = await bcrypt.hash('Admin@123', 10);
      const { rows: [admin] } = await client.query(
        `INSERT INTO employees (company_id, login_id, email, password_hash, role, first_name, last_name, job_position, department, year_of_joining, serial_number, monthly_wage, working_days_per_week, break_time_hrs)
         VALUES ($1,'OIAD2022001','admin@odooindia.com',$2,'admin','Admin','User','HR Manager','Human Resources',2022,1,80000,5,1) RETURNING id`,
        [companyId, adminHash]
      );

      // Create HR officer
      const hrHash = await bcrypt.hash('HR@12345', 10);
      await client.query(
        `INSERT INTO employees (company_id, login_id, email, password_hash, role, first_name, last_name, job_position, department, year_of_joining, serial_number, monthly_wage, working_days_per_week, break_time_hrs)
         VALUES ($1,'OIHR2022002','hr@odooindia.com',$2,'hr','HR','Officer','HR Officer','Human Resources',2022,2,60000,5,1)`,
        [companyId, hrHash]
      );

      // Create demo employee John Doe
      const empHash = await bcrypt.hash('Pass@1234', 10);
      const { rows: [emp1] } = await client.query(
        `INSERT INTO employees (company_id, login_id, email, password_hash, role, first_name, last_name, job_position, department, manager, year_of_joining, serial_number, monthly_wage, working_days_per_week, break_time_hrs, date_of_joining, emp_code, about, what_i_love, hobbies, skills, certifications)
         VALUES ($1,'OIJODO2023001','john.doe@odooindia.com',$2,'employee','John','Doe','Software Engineer','Engineering','Admin User',2023,1,50000,5,1,'2023-01-15','EMP001','Experienced software engineer with 5+ years in full-stack development.','Building scalable systems and solving complex problems.','Reading, hiking, open source contributions',ARRAY['React','Node.js','PostgreSQL','TypeScript'],ARRAY['AWS Certified Developer','React Advanced Certification']) RETURNING id`,
        [companyId, empHash]
      );

      // Create demo employee Jane Smith
      const emp2Hash = await bcrypt.hash('Pass@5678', 10);
      const { rows: [emp2] } = await client.query(
        `INSERT INTO employees (company_id, login_id, email, password_hash, role, first_name, last_name, job_position, department, manager, year_of_joining, serial_number, monthly_wage, working_days_per_week, break_time_hrs, date_of_joining, emp_code)
         VALUES ($1,'OIJASM2023002','jane.smith@odooindia.com',$2,'employee','Jane','Smith','UI/UX Designer','Design','Admin User',2023,2,45000,5,1,'2023-02-01','EMP002') RETURNING id`,
        [companyId, emp2Hash]
      );

      // Create more demo employees
      const names = [
        ['Alice','Johnson','Backend Dev','Engineering'],
        ['Bob','Williams','Frontend Dev','Engineering'],
        ['Carol','Brown','QA Engineer','Engineering'],
        ['David','Taylor','Product Manager','Product'],
        ['Eva','Wilson','Marketing Lead','Marketing'],
      ];
      for (let i = 0; i < names.length; i++) {
        const [fn, ln, pos, dept] = names[i];
        const hash = await bcrypt.hash('Pass@1234', 10);
        const li = `OI${fn.slice(0,2).toUpperCase()}${ln.slice(0,2).toUpperCase()}2023${String(i+3).padStart(3,'0')}`;
        const em = `${fn.toLowerCase()}.${ln.toLowerCase()}@odooindia.com`;
        await client.query(
          `INSERT INTO employees (company_id, login_id, email, password_hash, role, first_name, last_name, job_position, department, year_of_joining, serial_number, monthly_wage, working_days_per_week, break_time_hrs)
           VALUES ($1,$2,$3,$4,'employee',$5,$6,$7,$8,2023,$9,40000,5,1)`,
          [companyId, li, em, hash, fn, ln, pos, dept, i+3]
        );
      }

      // Create leave allocations for all employees
      const { rows: allEmps } = await client.query('SELECT id FROM employees');
      for (const e of allEmps) {
        await client.query(
          `INSERT INTO leave_allocations (employee_id, paid_leave, sick_leave, unpaid_leave) VALUES ($1, 24, 7, 999) ON CONFLICT (employee_id) DO NOTHING`,
          [e.id]
        );
      }

      // Seed some attendance for John
      const today = new Date();
      for (let d = 1; d <= 5; d++) {
        const dt = new Date(today);
        dt.setDate(today.getDate() - d);
        if (dt.getDay() === 0 || dt.getDay() === 6) continue;
        const dateStr = dt.toISOString().split('T')[0];
        await client.query(
          `INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, extra_hours, status)
           VALUES ($1, $2, '09:00', '18:00', 8, 1, 'present') ON CONFLICT (employee_id, date) DO NOTHING`,
          [emp1.id, dateStr]
        );
        await client.query(
          `INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, extra_hours, status)
           VALUES ($1, $2, '09:30', '18:30', 8, 1, 'present') ON CONFLICT (employee_id, date) DO NOTHING`,
          [emp2.id, dateStr]
        );
      }

      // Seed a sample leave request
      await client.query(
        `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, remarks, status)
         VALUES ($1, 'Paid Time Off', CURRENT_DATE + 5, CURRENT_DATE + 7, 'Family vacation', 'pending')`,
        [emp1.id]
      );

      // Seed notifications for admin
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Welcome to Dayflow HRMS', 'Your HRMS system is set up and ready to use.', 'success')`,
        [admin.id]
      );

      console.log('✅ Demo data seeded successfully');
    }
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
