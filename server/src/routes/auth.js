const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const { authMiddleware, signToken } = require('../middleware/auth');
const { formatEmployee } = require('../utils/formatters');
const { sendWelcomeEmail } = require('../services/emailService');

const EMPLOYEE_INCLUDE = { company: true };

// ─── Sign In ──────────────────────────────────────────────────────────────────
router.post('/signin', async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) return res.status(400).json({ error: 'Login ID and password required' });
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { loginId: { equals: loginId, mode: 'insensitive' } },
          { email: { equals: loginId, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: EMPLOYEE_INCLUDE,
    });
    if (!employee) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(employee.id);
    res.json({ token, user: formatEmployee(employee) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Sign Up (creates company + admin) ───────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { companyName, name, email, phone, password, logo } = req.body;
  if (!companyName || !name || !email || !password) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  try {
    const existing = await prisma.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const abbr = companyName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    const company = await prisma.company.create({
      data: { name: companyName, abbreviation: abbr, logo: logo || null },
    });

    const year = new Date().getFullYear();
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Ad';
    const lastName = nameParts[1] || 'Min';
    const initials = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase();
    const loginId = `${abbr}${initials}${year}001`;
    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        loginId,
        email,
        passwordHash,
        role: 'ADMIN',
        firstName,
        lastName,
        phone: phone || null,
        yearOfJoining: year,
        serialNumber: 1,
        leaveAllocation: {
          create: { paidLeave: 24, sickLeave: 7, unpaidLeave: 999 },
        },
      },
      include: EMPLOYEE_INCLUDE,
    });

    const token = signToken(employee.id);
    res.json({ token, user: formatEmployee(employee) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Get Current User ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.id },
    include: EMPLOYEE_INCLUDE,
  });
  res.json(formatEmployee(employee));
});

// ─── Change Password ──────────────────────────────────────────────────────────
router.put('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.employee.update({ where: { id: req.user.id }, data: { passwordHash } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
