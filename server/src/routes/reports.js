const router = require('express').Router();
const prisma = require('../db/prisma');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// ─── Reports Summary ──────────────────────────────────────────────────────────
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const today = new Date(new Date().toISOString().split('T')[0]);

    const [totalEmployees, presentToday, pendingLeaves, departments] = await Promise.all([
      prisma.employee.count({ where: { companyId: req.user.companyId, isActive: true } }),
      prisma.attendance.count({
        where: {
          employee: { companyId: req.user.companyId },
          date: today,
          status: 'PRESENT',
        },
      }),
      prisma.leaveRequest.count({
        where: {
          employee: { companyId: req.user.companyId },
          status: 'PENDING',
        },
      }),
      prisma.employee.groupBy({
        by: ['department'],
        where: { companyId: req.user.companyId, isActive: true },
        _count: { id: true },
      }),
    ]);

    // Monthly attendance for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyAtt = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        employee: { companyId: req.user.companyId },
        date: { gte: monthStart, lte: monthEnd },
      },
      _count: { id: true },
    });

    res.json({
      totalEmployees,
      presentToday,
      pendingLeaves,
      absentToday: totalEmployees - presentToday,
      departments: departments.map(d => ({
        name: d.department || 'Unassigned',
        count: d._count.id,
      })),
      monthlyAttendance: {
        present: monthlyAtt.find(a => a.status === 'PRESENT')?._count.id || 0,
        absent: monthlyAtt.find(a => a.status === 'ABSENT')?._count.id || 0,
        leave: monthlyAtt.find(a => a.status === 'LEAVE')?._count.id || 0,
        halfDay: monthlyAtt.find(a => a.status === 'HALF_DAY')?._count.id || 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
