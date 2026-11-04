const fs = require('fs');
const path = require('path');

class LocalStore {
  constructor(userDataPath) {
    this.storePath = path.join(userDataPath, 'officetask-store.json');
    this.defaultData = {
      config: {
        deviceId: 'OFFICE-PC-01',
        deviceKey: 'key-office-pc-01',
        serverUrl: 'http://localhost:5555',
        isLocked: true,
        cachedAdminPasswordHash: '$2a$10$Xm5b7gGg4cKkJ/fK8i7OfevA2ZeqrVdGf/39vC5tMvhE6m5gO6mKG', // Default hash for Admin@12345
        windowBounds: {
          x: null, // Will default to top-right corner
          y: 40,
          width: 360,
          height: 560
        }
      },
      cachedTasks: [],
      offlineQueue: [],
      lastSync: null
    };
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          config: { ...this.defaultData.config, ...(parsed.config || {}) },
          cachedTasks: Array.isArray(parsed.cachedTasks) ? parsed.cachedTasks : [],
          offlineQueue: Array.isArray(parsed.offlineQueue) ? parsed.offlineQueue : [],
          lastSync: parsed.lastSync || null
        };
      }
    } catch (err) {
      console.error('Failed to load local store, using defaults:', err);
    }
    return JSON.parse(JSON.stringify(this.defaultData));
  }

  save() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save local store:', err);
    }
  }

  getConfig() {
    return this.data.config;
  }

  updateConfig(updates) {
    this.data.config = { ...this.data.config, ...updates };
    this.save();
    return this.data.config;
  }

  getTasks() {
    return this.data.cachedTasks;
  }

  setTasks(tasks) {
    this.data.cachedTasks = tasks;
    this.data.lastSync = new Date().toISOString();
    this.save();
  }

  updateLocalTaskStatus(taskId, status) {
    const task = this.data.cachedTasks.find(t => t._id === taskId);
    if (task) {
      task.status = status;
      task.completedAt = status === 'completed' ? new Date().toISOString() : null;
      task.updatedAt = new Date().toISOString();
    }
    // Record offline change to queue
    const existingQueueIndex = this.data.offlineQueue.findIndex(q => q.taskId === taskId);
    if (existingQueueIndex >= 0) {
      this.data.offlineQueue[existingQueueIndex] = {
        taskId,
        status,
        completedAt: task ? task.completedAt : new Date().toISOString(),
        clientTimestamp: Date.now()
      };
    } else {
      this.data.offlineQueue.push({
        taskId,
        status,
        completedAt: task ? task.completedAt : new Date().toISOString(),
        clientTimestamp: Date.now()
      });
    }
    this.save();
    return this.data.cachedTasks;
  }

  getOfflineQueue() {
    return this.data.offlineQueue;
  }

  clearOfflineQueue() {
    this.data.offlineQueue = [];
    this.save();
  }

  getLastSync() {
    return this.data.lastSync;
  }
}

module.exports = LocalStore;
