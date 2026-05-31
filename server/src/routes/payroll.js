const router = require('express').Router();
const prisma = require('../db/prisma');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const computeSalary = (wage) => {
  const w = parseFloat(wage) || 0;
  const basic = w * 0.5;
  const hra = basic * 0.5;
  const standardAllowance = w * 0.1667;
  const perf = basic * 0.0833;
  const lta = basic * 0.0833;
  const fixed = Math.max(0, w - basic - hra - standardAllowance - perf - lta);
  const employeePf = basic * 0.12;
  const employerPf = basic * 0.12;
  const profTax = 200;
  const gross = basic + hra + standardAllowance + perf + lta + fixed;
  const netPay = gross - employeePf - profTax;
  return { basic, hra, standardAllowance, perf, lta, fixed, employeePf, employerPf, profTax, gross, netPay };
};

// ─── Get Payroll ──────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(req.user.role);
    const employees = await prisma.employee.findMany({
      where: isAdmin ? { companyId: req.user.companyId, isActive: true } : { id: req.user.id },
      orderBy: { firstName: 'asc' },
    });
    res.json(employees.map(e => ({
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      department: e.department,
      jobPosition: e.jobPosition,
      monthlyWage: parseFloat(e.monthlyWage) || 0,
      yearlyWage: (parseFloat(e.monthlyWage) || 0) * 12,
      workingDaysPerWeek: e.workingDaysPerWeek,
      breakTimeHrs: parseFloat(e.breakTimeHrs) || 1,
      ...computeSalary(e.monthlyWage),
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Update Payroll ───────────────────────────────────────────────────────────
router.put('/:empId', authMiddleware, requireAdmin, async (req, res) => {
  const { monthlyWage, workingDaysPerWeek, breakTimeHrs } = req.body;
  try {
    const old = await prisma.employee.findUnique({ where: { id: req.params.empId } });
    await prisma.employee.update({
      where: { id: req.params.empId },
      data: {
        ...(monthlyWage != null && { monthlyWage: parseFloat(monthlyWage) }),
        ...(workingDaysPerWeek != null && { workingDaysPerWeek }),
        ...(breakTimeHrs != null && { breakTimeHrs: parseFloat(breakTimeHrs) }),
      },
    });
    await logAudit(req.user.id, 'UPDATE_SALARY', 'Employee', req.params.empId,
      { monthlyWage: old.monthlyWage }, { monthlyWage });
    res.json({ message: 'Payroll updated', monthlyWage: parseFloat(monthlyWage) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
