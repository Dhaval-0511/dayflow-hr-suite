require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const prisma = require('./db/prisma');

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow any localhost origin in dev, or the configured FRONTEND_URL in prod
      if (!origin || origin.startsWith('http://localhost') || origin === process.env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store connected users: userId → socketId
const connectedUsers = new Map();

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`👤 User connected: ${userId}`);
  });

  socket.on('disconnect', () => {
    for (const [userId, sid] of connectedUsers.entries()) {
      if (sid === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👤 User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Make io & connectedUsers available in routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log('\n🚀 Dayflow HRMS Backend running on port', PORT);
    console.log('📡 API: http://localhost:' + PORT + '/api');
    console.log('🔌 WebSocket: Socket.io enabled');
    console.log('🗄️  Database: Neon PostgreSQL (Prisma)');
    console.log('\n📋 Demo credentials:');
    console.log('   Super Admin: error200404@gmail.com / SuperAdmin@123');
    console.log('   Admin      : admin@odooindia.com / Admin@123');
    console.log('   HR         : hr@odooindia.com / HR@12345');
    console.log('   Employee   : john.doe@odooindia.com / Pass@1234');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
});
