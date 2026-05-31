const router = require('express').Router();
const prisma = require('../db/prisma');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { sendLeaveStatusEmail, sendLeaveRequestEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');

// ─── Get Leave Requests ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(req.user.role);
    const leaves = await prisma.leaveRequest.findMany({
      where: isAdmin
        ? { employee: { companyId: req.user.companyId } }
        : { employeeId: req.user.id },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leaves.map(formatLeave));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Apply for Leave ──────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { leaveType, startDate, endDate, remarks, attachment } = req.body;
  if (!leaveType || !startDate || !endDate) return res.status(400).json({ error: 'Required fields missing' });
  if (endDate < startDate) return res.status(400).json({ error: 'End date must be after start date' });

  try {
    const alloc = await prisma.leaveAllocation.findUnique({ where: { employeeId: req.user.id } });
    if (!alloc) return res.status(400).json({ error: 'No leave allocation found' });

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: req.user.id,
        leaveType: leaveType.toUpperCase().replace(/ /g, '_'),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        remarks: remarks || null,
        attachment: attachment || null,
      },
      include: { employee: true },
    });

    // Notify all admin/hr in same company
    const admins = await prisma.employee.findMany({
      where: { companyId: req.user.companyId, role: { in: ['ADMIN', 'HR'] }, isActive: true },
    });
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        title: 'New Leave Request',
        message: `${req.user.firstName} ${req.user.lastName} submitted a ${leaveType} request`,
        type: 'INFO',
      })),
    });

    // Email admins (non-fatal)
    try {
      for (const admin of admins) {
        await sendLeaveRequestEmail({
          to: admin.email,
          adminName: admin.firstName,
          employeeName: `${req.user.firstName} ${req.user.lastName}`,
          leaveType,
          startDate,
          endDate,
        });
      }
    } catch (e) { console.warn('Email failed (non-fatal):', e.message); }

    // Push real-time notification to admins
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io && connectedUsers) {
      for (const admin of admins) {
        const sid = connectedUsers.get(admin.id);
        if (sid) {
          io.to(sid).emit('notification', {
            title: 'New Leave Request',
            message: `${req.user.firstName} ${req.user.lastName} submitted a ${leaveType} request`,
            type: 'info',
          });
        }
      }
    }

    res.json(formatLeave(leave));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Approve / Reject Leave ───────────────────────────────────────────────────
router.put('/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  const { status, adminComment } = req.body;
  const normalizedStatus = status?.toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normalizedStatus)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: normalizedStatus, adminComment: adminComment || null },
      include: { employee: true },
    });

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: leave.employeeId,
        title: `Leave ${normalizedStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Your ${leave.leaveType.replace(/_/g, ' ')} from ${leave.startDate.toISOString().split('T')[0]} has been ${normalizedStatus.toLowerCase()}.${adminComment ? ' Comment: ' + adminComment : ''}`,
        type: normalizedStatus === 'APPROVED' ? 'SUCCESS' : 'ERROR',
      },
    });

    // If approved, mark attendance as leave for each weekday
    if (normalizedStatus === 'APPROVED') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date: new Date(d) } },
          update: { status: 'LEAVE' },
          create: { employeeId: leave.employeeId, date: new Date(d), status: 'LEAVE' },
        });
      }
    }

    // Send email to employee (non-fatal)
    try {
      await sendLeaveStatusEmail({
        to: leave.employee.email,
        employeeName: leave.employee.firstName,
        leaveType: leave.leaveType.replace(/_/g, ' '),
        status: normalizedStatus,
        adminComment,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    } catch (e) { console.warn('Email failed (non-fatal):', e.message); }

    // Real-time push to employee
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io && connectedUsers) {
      const sid = connectedUsers.get(leave.employeeId);
      if (sid) {
        io.to(sid).emit('notification', {
          title: `Leave ${normalizedStatus === 'APPROVED' ? 'Approved ✅' : 'Rejected ❌'}`,
          message: `Your ${leave.leaveType.replace(/_/g, ' ')} has been ${normalizedStatus.toLowerCase()}.`,
          type: normalizedStatus === 'APPROVED' ? 'success' : 'error',
        });
      }
    }

    await logAudit(req.user.id, `${normalizedStatus}_LEAVE`, 'LeaveRequest', leave.id, { status: 'PENDING' }, { status: normalizedStatus });
    res.json(formatLeave(leave));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Get Leave Allocations ────────────────────────────────────────────────────
router.get('/allocations', authMiddleware, async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(req.user.role);
    if (isAdmin) {
      const allocs = await prisma.leaveAllocation.findMany({
        where: { employee: { companyId: req.user.companyId } },
        include: { employee: true },
      });
      res.json(allocs.map(a => ({
        employeeId: a.employeeId,
        employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
        paidLeave: a.paidLeave,
        sickLeave: a.sickLeave,
        unpaidLeave: a.unpaidLeave,
      })));
    } else {
      const alloc = await prisma.leaveAllocation.findUnique({ where: { employeeId: req.user.id } });
      res.json(alloc ? [{ employeeId: alloc.employeeId, paidLeave: alloc.paidLeave, sickLeave: alloc.sickLeave, unpaidLeave: alloc.unpaidLeave }] : []);
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Update Leave Allocation (Admin) ─────────────────────────────────────────
router.put('/allocations/:empId', authMiddleware, requireAdmin, async (req, res) => {
  const { paidLeave, sickLeave, unpaidLeave } = req.body;
  try {
    await prisma.leaveAllocation.upsert({
      where: { employeeId: req.params.empId },
      update: {
        ...(paidLeave != null && { paidLeave }),
        ...(sickLeave != null && { sickLeave }),
        ...(unpaidLeave != null && { unpaidLeave }),
      },
      create: {
        employeeId: req.params.empId,
        paidLeave: paidLeave ?? 24,
        sickLeave: sickLeave ?? 7,
        unpaidLeave: unpaidLeave ?? 999,
      },
    });
    res.json({ message: 'Allocation updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Formatter ────────────────────────────────────────────────────────────────
function formatLeave(r) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    leaveType: r.leaveType?.replace(/_/g, ' '),
    startDate: r.startDate?.toISOString?.()?.split('T')[0] ?? r.startDate,
    endDate: r.endDate?.toISOString?.()?.split('T')[0] ?? r.endDate,
    remarks: r.remarks,
    attachment: r.attachment,
    status: r.status?.toLowerCase(),
    adminComment: r.adminComment,
    createdAt: r.createdAt,
    employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : undefined,
    firstName: r.employee?.firstName,
    lastName: r.employee?.lastName,
  };
}

module.exports = router;
