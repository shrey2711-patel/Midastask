const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authenticateDeviceOrAdmin, authenticateAdmin } = require('../middleware/auth');

// Get Task Metrics across all devices (Admin)
router.get('/metrics', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();
    const totalPending = await Task.countDocuments({ status: 'pending' });
    const totalCompleted = await Task.countDocuments({ status: 'completed' });
    const totalOverdue = await Task.countDocuments({
      status: 'pending',
      dueDate: { $lt: now, $ne: null }
    });

    res.json({
      success: true,
      metrics: {
        totalPending,
        totalCompleted,
        totalOverdue,
        totalTasks: totalPending + totalCompleted
      }
    });
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate metrics' });
  }
});

// Get Tasks with filters
router.get('/', authenticateDeviceOrAdmin, async (req, res) => {
  try {
    const { deviceId, status, search } = req.query;
    const filter = {};

    // If request comes from a device (not admin), enforce its own deviceId
    if (req.authType === 'device') {
      filter.deviceId = req.device.deviceId;
    } else if (deviceId && deviceId !== 'ALL') {
      filter.deviceId = deviceId.toUpperCase();
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter)
      .sort({
        status: 1, // 'completed' comes after 'pending'
        priority: -1,
        dueDate: 1,
        createdAt: -1
      })
      .lean();

    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve tasks' });
  }
});

// Create Task (Admin or Device)
router.post('/', authenticateDeviceOrAdmin, async (req, res) => {
  try {
    const { deviceId, title, description, priority, dueDate } = req.body;

    const targetDeviceId = req.authType === 'device' ? req.device.deviceId : (deviceId || '').toUpperCase();
    if (!targetDeviceId) {
      return res.status(400).json({ success: false, error: 'Target deviceId is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const task = new Task({
      deviceId: targetDeviceId,
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    });

    await task.save();

    // Broadcast real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Send to target device room
      io.to(`device:${targetDeviceId}`).emit('task:created', task);
      // Send to admin room
      io.to('admin').emit('task:created', task);
    }

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

// Update Task
router.patch('/:id', authenticateDeviceOrAdmin, async (req, res) => {
  try {
    const { title, description, priority, dueDate, status, deviceId } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Devices can only edit their own tasks
    if (req.authType === 'device' && task.deviceId !== req.device.deviceId) {
      return res.status(403).json({ success: false, error: 'Cannot update task for another device' });
    }

    const oldDeviceId = task.deviceId;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) {
      task.status = status;
      task.completedAt = status === 'completed' ? new Date() : null;
    }
    if (deviceId !== undefined && req.authType === 'admin') {
      task.deviceId = deviceId.toUpperCase();
    }

    await task.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`device:${oldDeviceId}`).emit('task:updated', task);
      if (task.deviceId !== oldDeviceId) {
        io.to(`device:${task.deviceId}`).emit('task:created', task);
      }
      io.to('admin').emit('task:updated', task);
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// Toggle Task Status (Pending <-> Completed)
router.patch('/:id/toggle', authenticateDeviceOrAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (req.authType === 'device' && task.deviceId !== req.device.deviceId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.completedAt = task.status === 'completed' ? new Date() : null;
    await task.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`device:${task.deviceId}`).emit('task:toggled', task);
      io.to('admin').emit('task:toggled', task);
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ success: false, error: 'Failed to toggle task' });
  }
});

// Batch Sync for Offline Windows Widget Reconnection
router.post('/sync', authenticateDeviceOrAdmin, async (req, res) => {
  try {
    const deviceId = req.authType === 'device' ? req.device.deviceId : (req.body.deviceId || '').toUpperCase();
    const { offlineChanges } = req.body; // array of { taskId, status, completedAt }

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId required' });
    }

    const syncedResults = [];
    if (Array.isArray(offlineChanges) && offlineChanges.length > 0) {
      for (const change of offlineChanges) {
        if (!change.taskId) continue;
        const task = await Task.findOne({ _id: change.taskId, deviceId });
        if (task) {
          if (change.status) {
            task.status = change.status;
            task.completedAt = change.completedAt ? new Date(change.completedAt) : (change.status === 'completed' ? new Date() : null);
            await task.save();
            syncedResults.push(task);

            // Notify admin
            const io = req.app.get('io');
            if (io) {
              io.to('admin').emit('task:updated', task);
            }
          }
        }
      }
    }

    // Return the latest full task list for this device
    const latestTasks = await Task.find({ deviceId })
      .sort({ status: 1, priority: -1, dueDate: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      syncedCount: syncedResults.length,
      serverTime: new Date(),
      tasks: latestTasks
    });
  } catch (err) {
    console.error('Batch sync error:', err);
    res.status(500).json({ success: false, error: 'Offline sync failed' });
  }
});

// Delete Task (Admin Only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const deviceId = task.deviceId;
    await Task.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`device:${deviceId}`).emit('task:deleted', { taskId: req.params.id, deviceId });
      io.to('admin').emit('task:deleted', { taskId: req.params.id, deviceId });
    }

    res.json({ success: true, message: 'Task deleted successfully', taskId: req.params.id });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = router;
