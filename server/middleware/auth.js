const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');

const JWT_SECRET = process.env.JWT_SECRET || 'officetask-jwt-super-secret-key-2026';

// Middleware for Admin authentication via JWT
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or token invalid' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
  }
};

// Middleware that accepts either Admin JWT or valid Device credentials
const authenticateDeviceOrAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
        req.authType = 'admin';
        return next();
      }
    }

    // Check device credentials
    const deviceId = req.headers['x-device-id'] || req.query.deviceId;
    const deviceKey = req.headers['x-device-key'] || req.query.deviceKey;

    if (deviceId && deviceKey) {
      const device = await Device.findOne({ deviceId: deviceId.toUpperCase() }).select('+deviceKey');
      if (device && device.deviceKey === deviceKey) {
        req.device = device;
        req.authType = 'device';
        return next();
      }
    }

    return res.status(401).json({ success: false, error: 'Authentication failed. Valid device key or admin token required.' });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Authentication error' });
  }
};

module.exports = {
  authenticateAdmin,
  authenticateDeviceOrAdmin,
  JWT_SECRET
};
