require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const taskRoutes = require('./routes/tasks');
const { initSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5555;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/officetask';

// Security & Parsing Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts and assets for PWA dashboard
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-device-key']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach io instance to express app so routes can broadcast events
app.set('io', io);
initSocket(io);

// Static files for Mobile PWA Administrator Dashboard
const dashboardPath = path.join(__dirname, '..', 'dashboard');
app.use(express.static(dashboardPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'OfficeTask Server',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// PWA Fallback route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Server error' });
});

// Connect to MongoDB and Start Server
async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000
    });
    console.log('[OK] Connected to MongoDB Atlas successfully.');

    // Auto-seed defaults if needed
    try {
      const seedDatabase = require('./seeds/seed');
      // If run as background, can trigger seed check
    } catch (seedErr) {
      // ignore
    }

  } catch (err) {
    console.warn('\n[!] Warning: Could not connect to MongoDB database.');
    console.warn(`Reason: ${err.message}`);
    console.warn('To connect to MongoDB Atlas M0:');
    console.warn('1. Copy server/.env.example to server/.env');
    console.warn('2. Paste your MongoDB Atlas URI into MONGODB_URI=...');
    console.warn('Continuing server startup for local development / offline caching test...\n');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`OfficeTask Server running on http://localhost:${PORT}`);
    console.log(`iPhone Administrator Dashboard: http://localhost:${PORT}`);
    console.log(`Network access from iPhone: http://<YOUR-LAPTOP-IP>:${PORT}`);
    console.log('====================================================');
  });
}

startServer();

module.exports = { app, server };
