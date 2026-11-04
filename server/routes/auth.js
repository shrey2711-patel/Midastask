const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateAdmin, JWT_SECRET } = require('../middleware/auth');

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
});

// Verify Admin Token
router.get('/me', authenticateAdmin, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Verify Admin Password (used for Desktop Widget Admin Unlock Mode)
router.post('/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    // Find any admin user (or default admin)
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(404).json({ success: false, error: 'No admin configured on server' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect administrator password' });
    }

    // Return success and a short-lived unlock token + bcrypt hash for local caching
    const unlockToken = jwt.sign(
      { scope: 'widget_unlock', adminId: admin._id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      unlocked: true,
      unlockToken,
      passwordHash: admin.password // Safe for local device verification when offline
    });
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

module.exports = router;
