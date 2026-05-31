const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dayflow-hrms-secret-key-2024';

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
      include: { company: true },
    });
    if (!employee) return res.status(401).json({ error: 'User not found' });
    req.user = employee;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Role Guards ──────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'HR' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin/HR access required' });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
};

// ─── JWT Helper ───────────────────────────────────────────────────────────────
const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

module.exports = { authMiddleware, requireAdmin, requireSuperAdmin, signToken };
