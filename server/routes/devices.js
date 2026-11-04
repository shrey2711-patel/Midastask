const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Task = require('../models/Task');
const { authenticateAdmin } = require('../middleware/auth');

// Get all devices with their live task counts
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const devices = await Device.find().sort({ deviceId: 1 }).lean();

    // Attach task summary counts for each device
    const now = new Date();
    const devicesWithStats = await Promise.all(
      devices.map(async (dev) => {
        const pendingCount = await Task.countDocuments({ deviceId: dev.deviceId, status: 'pending' });
        const completedCount = await Task.countDocuments({ deviceId: dev.deviceId, status: 'completed' });
        const overdueCount = await Task.countDocuments({
          deviceId: dev.deviceId,
          status: 'pending',
          dueDate: { $lt: now, $ne: null }
        });

        return {
          ...dev,
          stats: {
            pending: pendingCount,
            completed: completedCount,
            overdue: overdueCount,
            total: pendingCount + completedCount
          }
        };
      })
    );

    res.json({ success: true, devices: devicesWithStats });
  } catch (err) {
    console.error('Fetch devices error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve devices' });
  }
});

// Get single device
router.get('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId.toUpperCase();
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    res.json({ success: true, device });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve device' });
  }
});

// Register or check in device
router.post('/register', async (req, res) => {
  try {
    const { deviceId, deviceKey, systemInfo } = req.body;
    if (!deviceId || !deviceKey) {
      return res.status(400).json({ success: false, error: 'deviceId and deviceKey are required' });
    }

    const upperDeviceId = deviceId.toUpperCase();
    let device = await Device.findOne({ deviceId: upperDeviceId }).select('+deviceKey');

    if (!device) {
      // Auto-register allowed office devices
      const validDevices = ['OFFICE-PC-01', 'OFFICE-PC-02', 'OFFICE-PC-03'];
      if (!validDevices.includes(upperDeviceId)) {
        return res.status(400).json({ success: false, error: 'Unauthorized device ID' });
      }

      device = new Device({
        deviceId: upperDeviceId,
        name: `Office Laptop ${upperDeviceId.split('-')[2] || 'PC'}`,
        deviceKey: deviceKey,
        status: 'online',
        lastSeen: new Date(),
        systemInfo: systemInfo || {}
      });
      await device.save();
    } else {
      // Verify key
      if (device.deviceKey !== deviceKey) {
        return res.status(401).json({ success: false, error: 'Invalid device credentials' });
      }
      device.status = 'online';
      device.lastSeen = new Date();
      if (systemInfo) device.systemInfo = systemInfo;
      await device.save();
    }

    // Broadcast device status update if io is attached
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('device:status', {
        deviceId: upperDeviceId,
        status: 'online',
        lastSeen: device.lastSeen
      });
    }

    res.json({
      success: true,
      device: {
        deviceId: device.deviceId,
        name: device.name,
        status: device.status,
        lastSeen: device.lastSeen
      }
    });
  } catch (err) {
    console.error('Device register error:', err);
    res.status(500).json({ success: false, error: 'Device registration error' });
  }
});

module.exports = router;
