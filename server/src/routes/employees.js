const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { formatEmployee } = require('../utils/formatters');
const { sendNewEmployeeEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');

const EMPLOYEE_INCLUDE = { company: true };

// ─── Get All Employees ────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      include: EMPLOYEE_INCLUDE,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    res.json(employees.map(formatEmployee));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Get Single Employee ──────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: EMPLOYEE_INCLUDE,
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(formatEmployee(employee));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Create Employee (Admin/HR) ───────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const {
    firstName, lastName, email, phone, role = 'EMPLOYEE',
    jobPosition, department, location, monthlyWage = 0,
    workingDaysPerWeek = 5, breakTimeHrs = 1,
  } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  try {
    const existing = await prisma.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    const abbr = company?.abbreviation || 'CO';
    const year = new Date().getFullYear();

    const count = await prisma.employee.count({
      where: { companyId: req.user.companyId, yearOfJoining: year },
    });
    const serial = count + 1;
    const initials = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase();
    const loginId = `${abbr}${initials}${year}${String(serial).padStart(3, '0')}`;

    const genPassword = `${firstName.slice(0, 3)}@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(genPassword, 10);

    const employee = await prisma.employee.create({
      data: {
        companyId: req.user.companyId,
        loginId,
        email,
        passwordHash,
        role: role.toUpperCase(),
        firstName,
        lastName,
        phone: phone || null,
        jobPosition: jobPosition || null,
        department: department || null,
        location: location || null,
        monthlyWage: parseFloat(monthlyWage) || 0,
        workingDaysPerWeek,
        breakTimeHrs,
        yearOfJoining: year,
        serialNumber: serial,
        leaveAllocation: {
          create: { paidLeave: 24, sickLeave: 7, unpaidLeave: 999 },
        },
      },
    });

    // Notify the creating admin
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Employee Created',
        message: `${firstName} ${lastName} added with Login ID: ${loginId}`,
        type: 'SUCCESS',
      },
    });

    // Send welcome email
    try {
      await sendNewEmployeeEmail({ email, firstName, lastName, loginId, password: genPassword });
    } catch (emailErr) {
      console.warn('Email send failed (non-fatal):', emailErr.message);
    }

    await logAudit(req.user.id, 'CREATE_EMPLOYEE', 'Employee', employee.id, null, { loginId, email });

    res.json({ loginId, generatedPassword: genPassword, employeeId: employee.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Update Employee ──────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const isAdmin = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(req.user.role);
  const isSelf = req.user.id === req.params.id;
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Forbidden' });

  const adminFields = [
    'firstName', 'lastName', 'email', 'jobPosition', 'department',
    'location', 'monthlyWage', 'workingDaysPerWeek', 'breakTimeHrs',
    'dateOfJoining', 'empCode', 'role',
  ];
  const employeeFields = [
    'phone', 'avatar', 'dateOfBirth', 'residingAddress', 'nationality',
    'personalEmail', 'gender', 'maritalStatus', 'about', 'whatILove',
    'hobbies', 'skills', 'certifications', 'accountNumber', 'bankName',
    'ifscCode', 'panNo', 'uanNo',
  ];
  const allowedFields = isAdmin ? [...adminFields, ...employeeFields] : employeeFields;

  const data = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      data[field] = req.body[field];
    }
  }

  if (data.monthlyWage !== undefined) data.monthlyWage = parseFloat(data.monthlyWage) || 0;
  if (data.role) data.role = data.role.toUpperCase();

  if (Object.keys(data).length === 0) return res.json({ message: 'Nothing to update' });

  try {
    const oldEmp = await prisma.employee.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.employee.update({
      where: { id: req.params.id },
      data,
      include: EMPLOYEE_INCLUDE,
    });
    await logAudit(req.user.id, 'UPDATE_EMPLOYEE', 'Employee', req.params.id, oldEmp, data);
    res.json(formatEmployee(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Delete Employee (Admin) ──────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Soft delete
    await prisma.employee.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    await logAudit(req.user.id, 'DELETE_EMPLOYEE', 'Employee', req.params.id, null, null);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
