require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const roomRoutes = require('./routes/room');
const vocabRoutes = require('./routes/vocab');
const chatHandler = require('./socket/chatHandler');

const app = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const envOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...envOrigins,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ]),
];


app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/room', roomRoutes);
app.use('/api/vocab', vocabRoutes);

// ─── SOCKET EVENTS ────────────────────────────────────────────────────────────
chatHandler(io);

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 PandaChat server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌐 Client origin: ${allowedOrigins.join(', ')}`);
  });
});
