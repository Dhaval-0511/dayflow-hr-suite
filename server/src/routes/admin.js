const router = require('express').Router();
const prisma = require('../db/prisma');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');

// ─── All Companies (Super Admin only) ────────────────────────────────────────
router.get('/companies', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(companies.map(c => ({
      id: c.id,
      name: c.name,
      abbreviation: c.abbreviation,
      isActive: c.isActive,
      employeeCount: c._count.employees,
      createdAt: c.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Toggle Company Active Status ────────────────────────────────────────────
router.put('/companies/:id/toggle', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const updated = await prisma.company.update({
      where: { id: req.params.id },
      data: { isActive: !company.isActive },
    });
    res.json({ message: `Company ${updated.isActive ? 'activated' : 'deactivated'}`, isActive: updated.isActive });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Audit Logs (Super Admin only) ───────────────────────────────────────────
router.get('/audit-logs', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });
    const total = await prisma.auditLog.count();
    res.json({
      logs: logs.map(l => ({
        id: l.id,
        actor: `${l.actor.firstName} ${l.actor.lastName}`,
        actorEmail: l.actor.email,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        oldValue: l.oldValue,
        newValue: l.newValue,
        createdAt: l.createdAt,
      })),
      total,
      page: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── System Stats (Super Admin only) ─────────────────────────────────────────
router.get('/stats', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const [totalCompanies, totalEmployees, totalLeaves, totalAuditLogs] = await Promise.all([
      prisma.company.count(),
      prisma.employee.count(),
      prisma.leaveRequest.count(),
      prisma.auditLog.count(),
    ]);
    res.json({ totalCompanies, totalEmployees, totalLeaves, totalAuditLogs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
