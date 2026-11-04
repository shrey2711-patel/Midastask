const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('officeTaskApi', {
  // Authentication & Lock
  unlockAdmin: (password) => ipcRenderer.invoke('admin:unlock', password),
  lockAdmin: () => ipcRenderer.invoke('admin:lock'),
  getLockStatus: () => ipcRenderer.invoke('admin:get-lock-status'),
  
  // Settings & Window Control (Protected)
  saveConfig: (newConfig) => ipcRenderer.invoke('config:save', newConfig),
  closeWidget: () => ipcRenderer.invoke('window:close'),
  
  // Window Dragging (only active when unlocked)
  startWindowDrag: () => ipcRenderer.send('window:drag-start'),
  moveWindowDelta: (dx, dy) => ipcRenderer.send('window:drag-move', { dx, dy }),

  // Tasks
  getTasks: () => ipcRenderer.invoke('tasks:get'),
  toggleTask: (taskId) => ipcRenderer.invoke('tasks:toggle', taskId),
  syncNow: () => ipcRenderer.invoke('tasks:sync-now'),

  // Listeners for push updates from Main Process
  onTasksUpdated: (callback) => {
    const handler = (_event, tasks) => callback(tasks);
    ipcRenderer.on('tasks:updated', handler);
    return () => ipcRenderer.removeListener('tasks:updated', handler);
  },
  onSyncStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('sync:status', handler);
    return () => ipcRenderer.removeListener('sync:status', handler);
  },
  onLockStatusChanged: (callback) => {
    const handler = (_event, isLocked) => callback(isLocked);
    ipcRenderer.on('lock:status-changed', handler);
    return () => ipcRenderer.removeListener('lock:status-changed', handler);
  }
});
