const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const bcrypt = require('bcryptjs');
const { io } = require('socket.io-client');
const LocalStore = require('./store');

let mainWindow = null;
let store = null;
let socket = null;
let isUnlocked = false; // Admin unlock mode state
let unlockTimeout = null;

// Prevent multiple instances on the same machine
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

function createWindow() {
  store = new LocalStore(app.getPath('userData'));
  const config = store.getConfig();

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  const defaultWidth = 360;
  const defaultHeight = 570;

  // Position at top-right corner with 20px padding if not explicitly saved
  let posX = config.windowBounds?.x;
  let posY = config.windowBounds?.y;

  if (posX === null || posX === undefined || posX > workArea.width - 100) {
    posX = workArea.x + workArea.width - defaultWidth - 24;
  }
  if (posY === null || posY === undefined || posY > workArea.height - 100) {
    posY = workArea.y + 24;
  }

  mainWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    x: posX,
    y: posY,
    minWidth: defaultWidth,
    maxWidth: defaultWidth,
    minHeight: 400,
    maxHeight: 800,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false, // Locked resizing
    movable: false,   // Locked moving by default until admin unlocks
    skipTaskbar: false,
    hasShadow: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // Save position when moved (only possible during unlocked admin mode)
  mainWindow.on('moved', () => {
    if (mainWindow && isUnlocked) {
      const bounds = mainWindow.getBounds();
      store.updateConfig({ windowBounds: bounds });
    }
  });

  // Setup Socket.IO connection
  setupSocketConnection();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------
// Real-time Socket.IO and Data Synchronization
// ----------------------------------------------------
function setupSocketConnection() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const config = store.getConfig();
  const serverUrl = config.serverUrl || 'http://localhost:5000';

  sendSyncStatus({ state: 'connecting', message: 'Connecting to office server...' });

  socket = io(serverUrl, {
    auth: {
      type: 'device',
      deviceId: config.deviceId,
      deviceKey: config.deviceKey
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 5000
  });

  socket.on('connect', async () => {
    console.log(`[Socket] Connected to ${serverUrl} as ${config.deviceId}`);
    sendSyncStatus({ state: 'online', message: 'Live synchronized' });

    // 1. Process offline changes queue
    await syncOfflineChanges();

    // 2. Fetch fresh tasks from server
    await fetchTasksFromServer();
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
    sendSyncStatus({
      state: 'offline',
      message: 'Offline (cached mode)',
      queueCount: store.getOfflineQueue().length
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    sendSyncStatus({
      state: 'offline',
      message: 'Server disconnected (offline)',
      queueCount: store.getOfflineQueue().length
    });
  });

  // Real-time incoming task events from Admin iPhone
  socket.on('task:created', (task) => {
    if (task.deviceId === store.getConfig().deviceId) {
      const currentTasks = store.getTasks();
      const existing = currentTasks.find(t => t._id === task._id);
      if (!existing) {
        currentTasks.unshift(task);
        store.setTasks(currentTasks);
        notifyRendererTasksUpdated();
      }
    }
  });

  socket.on('task:updated', (task) => {
    const currentTasks = store.getTasks();
    if (task.deviceId === store.getConfig().deviceId) {
      const index = currentTasks.findIndex(t => t._id === task._id);
      if (index >= 0) {
        currentTasks[index] = task;
      } else {
        currentTasks.unshift(task);
      }
      store.setTasks(currentTasks);
      notifyRendererTasksUpdated();
    } else {
      // If task was reassigned to another laptop, remove from this laptop's list
      const filtered = currentTasks.filter(t => t._id !== task._id);
      if (filtered.length !== currentTasks.length) {
        store.setTasks(filtered);
        notifyRendererTasksUpdated();
      }
    }
  });

  socket.on('task:toggled', (task) => {
    if (task.deviceId === store.getConfig().deviceId) {
      const currentTasks = store.getTasks();
      const index = currentTasks.findIndex(t => t._id === task._id);
      if (index >= 0) {
        currentTasks[index] = task;
        store.setTasks(currentTasks);
        notifyRendererTasksUpdated();
      }
    }
  });

  socket.on('task:deleted', (data) => {
    const currentTasks = store.getTasks();
    const filtered = currentTasks.filter(t => t._id !== data.taskId);
    if (filtered.length !== currentTasks.length) {
      store.setTasks(filtered);
      notifyRendererTasksUpdated();
    }
  });
}

async function syncOfflineChanges() {
  const offlineQueue = store.getOfflineQueue();
  if (!offlineQueue || offlineQueue.length === 0) return;

  const config = store.getConfig();
  const serverUrl = config.serverUrl;

  try {
    const res = await fetch(`${serverUrl}/api/tasks/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': config.deviceId,
        'x-device-key': config.deviceKey
      },
      body: JSON.stringify({
        deviceId: config.deviceId,
        offlineChanges: offlineQueue
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        store.clearOfflineQueue();
        if (data.tasks) {
          store.setTasks(data.tasks);
          notifyRendererTasksUpdated();
        }
        sendSyncStatus({ state: 'online', message: 'All offline changes synchronized' });
      }
    }
  } catch (err) {
    console.error('Failed to sync offline changes:', err.message);
  }
}

async function fetchTasksFromServer() {
  const config = store.getConfig();
  const serverUrl = config.serverUrl;

  try {
    const res = await fetch(`${serverUrl}/api/tasks?deviceId=${config.deviceId}`, {
      headers: {
        'x-device-id': config.deviceId,
        'x-device-key': config.deviceKey
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        store.setTasks(data.tasks);
        notifyRendererTasksUpdated();
        sendSyncStatus({
          state: 'online',
          message: `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch latest tasks, using local cache:', err.message);
  }
}

function sendSyncStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync:status', {
      ...status,
      lastSync: store.getLastSync(),
      queueCount: store.getOfflineQueue().length
    });
  }
}

function notifyRendererTasksUpdated() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tasks:updated', store.getTasks());
  }
}

// ----------------------------------------------------
// Password-Protected Electron IPC Handlers
// ----------------------------------------------------

// 1. Admin Unlock Mode
ipcMain.handle('admin:unlock', async (_event, password) => {
  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  const config = store.getConfig();
  let verified = false;

  // Try online verification first
  try {
    const res = await fetch(`${config.serverUrl}/api/auth/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        verified = true;
        // Cache the verified bcrypt hash for offline verification
        if (data.passwordHash) {
          store.updateConfig({ cachedAdminPasswordHash: data.passwordHash });
        }
      }
    }
  } catch (err) {
    console.log('Online auth check unreachable, falling back to local cached hash:', err.message);
  }

  // Fallback to local cached bcrypt hash if offline or server unreachable
  if (!verified && config.cachedAdminPasswordHash) {
    try {
      verified = bcrypt.compareSync(password, config.cachedAdminPasswordHash);
    } catch (e) {
      console.error('Bcrypt compare error:', e);
    }
  }

  if (verified) {
    isUnlocked = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setMovable(true); // Enable window dragging while unlocked
      mainWindow.webContents.send('lock:status-changed', false);
    }

    // Auto-relock after 5 minutes of inactivity for safety
    if (unlockTimeout) clearTimeout(unlockTimeout);
    unlockTimeout = setTimeout(() => {
      lockAdminMode();
    }, 5 * 60 * 1000);

    return { success: true, isUnlocked: true };
  } else {
    return { success: false, error: 'Incorrect administrator password' };
  }
});

function lockAdminMode() {
  isUnlocked = false;
  if (unlockTimeout) {
    clearTimeout(unlockTimeout);
    unlockTimeout = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setMovable(false); // Lock window movement
    mainWindow.webContents.send('lock:status-changed', true);
  }
}

// 2. Lock Mode
ipcMain.handle('admin:lock', async () => {
  lockAdminMode();
  return { success: true, isUnlocked: false };
});

ipcMain.handle('admin:get-lock-status', async () => {
  return {
    isLocked: !isUnlocked,
    config: {
      deviceId: store.getConfig().deviceId,
      serverUrl: store.getConfig().serverUrl
    }
  };
});

// 3. Protected Window Close
ipcMain.handle('window:close', async () => {
  if (!isUnlocked) {
    throw new Error('Access Denied: Administrator authentication required to close widget.');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  app.quit();
});

// 4. Protected Config Save
ipcMain.handle('config:save', async (_event, newConfig) => {
  if (!isUnlocked) {
    throw new Error('Access Denied: Administrator authentication required to modify settings.');
  }

  const updated = store.updateConfig({
    deviceId: (newConfig.deviceId || 'OFFICE-PC-01').toUpperCase(),
    serverUrl: newConfig.serverUrl || 'http://localhost:5000',
    deviceKey: newConfig.deviceKey || store.getConfig().deviceKey
  });

  // Re-connect socket with new device settings
  setupSocketConnection();

  return { success: true, config: updated };
});

// 5. Window Dragging Coordination (Only allowed when unlocked)
let dragStartPosition = null;
ipcMain.on('window:drag-start', () => {
  if (!isUnlocked || !mainWindow) return;
  dragStartPosition = mainWindow.getPosition();
});

ipcMain.on('window:drag-move', (_event, { dx, dy }) => {
  if (!isUnlocked || !mainWindow || !dragStartPosition) return;
  mainWindow.setPosition(dragStartPosition[0] + dx, dragStartPosition[1] + dy);
});

// 6. Tasks Retrieval & Toggle
ipcMain.handle('tasks:get', async () => {
  return store.getTasks();
});

ipcMain.handle('tasks:toggle', async (_event, taskId) => {
  const tasks = store.getTasks();
  const task = tasks.find(t => t._id === taskId);
  if (!task) return { success: false, error: 'Task not found' };

  const newStatus = task.status === 'completed' ? 'pending' : 'completed';

  // 1. Update local store immediately (optimistic UI)
  const updatedTasks = store.updateLocalTaskStatus(taskId, newStatus);
  notifyRendererTasksUpdated();

  // 2. If online and socket connected, emit directly
  if (socket && socket.connected) {
    socket.emit('task:toggle', { taskId });
    // Also clear from offline queue if socket confirmed
    store.clearOfflineQueue();
    sendSyncStatus({ state: 'online', message: 'Synchronized' });
  } else {
    // Left in offline queue in store
    sendSyncStatus({
      state: 'offline',
      message: 'Saved offline - will sync when online',
      queueCount: store.getOfflineQueue().length
    });
  }

  return { success: true, task: task };
});

ipcMain.handle('tasks:sync-now', async () => {
  await syncOfflineChanges();
  await fetchTasksFromServer();
  return { success: true };
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
