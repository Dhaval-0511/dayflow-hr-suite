const router = require('express').Router();
const prisma = require('../db/prisma');
const { authMiddleware } = require('../middleware/auth');

// ─── Get Notifications ────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type?.toLowerCase(),
      isRead: n.isRead,
      createdAt: n.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Mark One as Read ─────────────────────────────────────────────────────────
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Mark All as Read ─────────────────────────────────────────────────────────
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
