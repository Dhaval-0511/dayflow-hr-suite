require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Create Demo Company ──────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 'demo-company-001' },
    update: {},
    create: {
      id: 'demo-company-001',
      name: 'OdooIndia Pvt Ltd',
      abbreviation: 'ODO',
    },
  });
  console.log('✅ Company created:', company.name);

  // ─── Helper: Hash password ────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ─── Create Super Admin (YOU) ─────────────────────────────────────────────
  const superAdmin = await prisma.employee.upsert({
    where: { email: process.env.SUPER_ADMIN_EMAIL || 'error200404@gmail.com' },
    update: {},
    create: {
      companyId: company.id,
      loginId: 'SUPERADMIN001',
      email: process.env.SUPER_ADMIN_EMAIL || 'error200404@gmail.com',
      passwordHash: hash('SuperAdmin@123'),
      role: 'SUPER_ADMIN',
      firstName: 'Dhaval',
      lastName: 'Admin',
      jobPosition: 'System Administrator',
      department: 'IT',
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // ─── Create Admin ─────────────────────────────────────────────────────────
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@odooindia.com' },
    update: {},
    create: {
      companyId: company.id,
      loginId: 'ODO-ADM-2024-001',
      email: 'admin@odooindia.com',
      passwordHash: hash('Admin@123'),
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      jobPosition: 'HR Manager',
      department: 'Human Resources',
      yearOfJoining: 2024,
      serialNumber: 1,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // ─── Create HR ────────────────────────────────────────────────────────────
  const hr = await prisma.employee.upsert({
    where: { email: 'hr@odooindia.com' },
    update: {},
    create: {
      companyId: company.id,
      loginId: 'ODO-HR-2024-001',
      email: 'hr@odooindia.com',
      passwordHash: hash('HR@12345'),
      role: 'HR',
      firstName: 'HR',
      lastName: 'Officer',
      jobPosition: 'HR Officer',
      department: 'Human Resources',
      yearOfJoining: 2024,
      serialNumber: 2,
    },
  });
  console.log('✅ HR created:', hr.email);

  // ─── Create Employee 1 ────────────────────────────────────────────────────
  const emp1 = await prisma.employee.upsert({
    where: { email: 'john.doe@odooindia.com' },
    update: {},
    create: {
      companyId: company.id,
      loginId: 'ODO-JD-2024-001',
      email: 'john.doe@odooindia.com',
      passwordHash: hash('Pass@1234'),
      role: 'EMPLOYEE',
      firstName: 'John',
      lastName: 'Doe',
      jobPosition: 'Software Engineer',
      department: 'Engineering',
      monthlyWage: 60000,
      yearOfJoining: 2024,
      serialNumber: 3,
    },
  });
  console.log('✅ Employee 1 created:', emp1.email);

  // ─── Create Employee 2 ────────────────────────────────────────────────────
  const emp2 = await prisma.employee.upsert({
    where: { email: 'jane.smith@odooindia.com' },
    update: {},
    create: {
      companyId: company.id,
      loginId: 'ODO-JS-2024-002',
      email: 'jane.smith@odooindia.com',
      passwordHash: hash('Pass@5678'),
      role: 'EMPLOYEE',
      firstName: 'Jane',
      lastName: 'Smith',
      jobPosition: 'Product Designer',
      department: 'Design',
      monthlyWage: 55000,
      yearOfJoining: 2024,
      serialNumber: 4,
    },
  });
  console.log('✅ Employee 2 created:', emp2.email);

  // ─── Create Leave Allocations ─────────────────────────────────────────────
  for (const emp of [admin, hr, emp1, emp2]) {
    await prisma.leaveAllocation.upsert({
      where: { employeeId: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        paidLeave: 24,
        sickLeave: 7,
        unpaidLeave: 999,
      },
    });
  }
  console.log('✅ Leave allocations created');

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('   Super Admin : error200404@gmail.com / SuperAdmin@123');
  console.log('   Admin       : admin@odooindia.com / Admin@123');
  console.log('   HR          : hr@odooindia.com / HR@12345');
  console.log('   Employee 1  : john.doe@odooindia.com / Pass@1234');
  console.log('   Employee 2  : jane.smith@odooindia.com / Pass@5678');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
