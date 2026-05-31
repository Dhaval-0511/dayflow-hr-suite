const router = require('express').Router();
const prisma = require('../db/prisma');
const { authMiddleware } = require('../middleware/auth');

const pad = n => String(n).padStart(2, '0');
const getTimeStr = () => { const now = new Date(); return `${pad(now.getHours())}:${pad(now.getMinutes())}`; };
const calcHours = (ci, co) => {
  if (!ci || !co) return { work: 0, extra: 0 };
  const [ih, im] = ci.split(':').map(Number);
  const [oh, om] = co.split(':').map(Number);
  const workMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
  return { work: workMins / 60, extra: Math.max(0, workMins - 480) / 60 };
};
const formatAtt = r => ({
  id: r.id, employeeId: r.employeeId,
  date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
  checkIn: r.checkIn, checkOut: r.checkOut,
  workHours: r.workHours ? parseFloat(r.workHours) : null,
  extraHours: r.extraHours ? parseFloat(r.extraHours) : null,
  status: r.status?.toLowerCase(),
  firstName: r.employee?.firstName,
  lastName: r.employee?.lastName,
  employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : undefined,
  department: r.employee?.department,
});

// ─── Get Attendance ───────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(req.user.role);
    const { date, month, year } = req.query;

    let where = {};
    if (isAdmin) {
      where.employee = { companyId: req.user.companyId };
      if (date) where.date = new Date(date);
      else if (month && year) {
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = new Date(parseInt(year), parseInt(month), 0);
        where.date = { gte: start, lte: end };
      } else {
        where.date = new Date(new Date().toISOString().split('T')[0]);
      }
    } else {
      where.employeeId = req.user.id;
      if (month && year) {
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = new Date(parseInt(year), parseInt(month), 0);
        where.date = { gte: start, lte: end };
      } else {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        where.date = { gte: monthAgo };
      }
    }

    const records = await prisma.attendance.findMany({
      where,
      include: isAdmin ? { employee: true } : false,
      orderBy: { date: 'desc' },
    });
    res.json(records.map(formatAtt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Today's Attendance ───────────────────────────────────────────────────────
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date(new Date().toISOString().split('T')[0]);
    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
    });
    res.json(record ? formatAtt(record) : null);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Check In ─────────────────────────────────────────────────────────────────
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const today = new Date(new Date().toISOString().split('T')[0]);
    const time = getTimeStr();
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
    });
    if (existing?.checkIn) return res.status(400).json({ error: 'Already checked in today' });

    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
      update: { checkIn: time, status: 'PRESENT' },
      create: { employeeId: req.user.id, date: today, checkIn: time, status: 'PRESENT' },
    });
    res.json(formatAtt(record));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Check Out ────────────────────────────────────────────────────────────────
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const today = new Date(new Date().toISOString().split('T')[0]);
    const time = getTimeStr();
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
    });
    if (!existing?.checkIn) return res.status(400).json({ error: 'You have not checked in today' });
    if (existing?.checkOut) return res.status(400).json({ error: 'Already checked out today' });

    const { work, extra } = calcHours(existing.checkIn, time);
    const record = await prisma.attendance.update({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
      data: { checkOut: time, workHours: parseFloat(work.toFixed(2)), extraHours: parseFloat(extra.toFixed(2)) },
    });
    res.json(formatAtt(record));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
