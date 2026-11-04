const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const Task = require('../models/Task');
const { JWT_SECRET } = require('../middleware/auth');

function initSocket(io) {
  // Map of active device socket connections: deviceId -> Set of socket IDs
  const activeDeviceSockets = new Map();

  io.on('connection', async (socket) => {
    const auth = socket.handshake.auth || {};
    const { token, type, deviceId, deviceKey } = auth;

    let authenticatedRole = null;
    let boundDeviceId = null;

    // Handle Admin authentication
    if (type === 'admin' || token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        authenticatedRole = 'admin';
        socket.join('admin');
        socket.emit('auth:success', { role: 'admin', userId: decoded.userId });
      } catch (err) {
        socket.emit('auth:error', { message: 'Invalid admin token' });
      }
    }

    // Handle Device authentication
    if (type === 'device' || deviceId) {
      try {
        const upperDeviceId = (deviceId || '').toUpperCase();
        const device = await Device.findOne({ deviceId: upperDeviceId }).select('+deviceKey');

        if (device && (!deviceKey || device.deviceKey === deviceKey)) {
          authenticatedRole = 'device';
          boundDeviceId = upperDeviceId;
          socket.join(`device:${upperDeviceId}`);

          // Track active sockets for this device
          if (!activeDeviceSockets.has(upperDeviceId)) {
            activeDeviceSockets.set(upperDeviceId, new Set());
          }
          activeDeviceSockets.get(upperDeviceId).add(socket.id);

          // Update device status in database
          device.status = 'online';
          device.lastSeen = new Date();
          await device.save();

          // Notify admins
          io.to('admin').emit('device:status', {
            deviceId: upperDeviceId,
            status: 'online',
            lastSeen: device.lastSeen
          });

          socket.emit('auth:success', {
            role: 'device',
            deviceId: upperDeviceId,
            name: device.name
          });
        } else {
          socket.emit('auth:error', { message: 'Invalid device credentials' });
        }
      } catch (err) {
        console.error('Socket device auth error:', err);
        socket.emit('auth:error', { message: 'Device authentication failed' });
      }
    }

    // Fast-path real-time task toggle via socket
    socket.on('task:toggle', async (data) => {
      try {
        const { taskId } = data;
        const task = await Task.findById(taskId);
        if (!task) return;

        // If device, enforce deviceId match
        if (authenticatedRole === 'device' && task.deviceId !== boundDeviceId) {
          return socket.emit('error', { message: 'Unauthorized task modification' });
        }

        task.status = task.status === 'completed' ? 'pending' : 'completed';
        task.completedAt = task.status === 'completed' ? new Date() : null;
        await task.save();

        // Broadcast to device and admin rooms
        io.to(`device:${task.deviceId}`).emit('task:toggled', task);
        io.to('admin').emit('task:toggled', task);
      } catch (err) {
        console.error('Socket task:toggle error:', err);
      }
    });

    // Device Heartbeat
    socket.on('device:ping', async () => {
      if (boundDeviceId) {
        await Device.updateOne(
          { deviceId: boundDeviceId },
          { $set: { status: 'online', lastSeen: new Date() } }
        );
        socket.emit('device:pong', { timestamp: Date.now() });
      }
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      if (boundDeviceId) {
        const sockets = activeDeviceSockets.get(boundDeviceId);
        if (sockets) {
          sockets.delete(socket.id);
          // If no more open sockets for this device, mark offline
          if (sockets.size === 0) {
            activeDeviceSockets.delete(boundDeviceId);
            try {
              const lastSeen = new Date();
              await Device.updateOne(
                { deviceId: boundDeviceId },
                { $set: { status: 'offline', lastSeen } }
              );
              io.to('admin').emit('device:status', {
                deviceId: boundDeviceId,
                status: 'offline',
                lastSeen
              });
            } catch (e) {
              console.error('Error updating device offline status:', e);
            }
          }
        }
      }
    });
  });

  return io;
}

module.exports = { initSocket };
