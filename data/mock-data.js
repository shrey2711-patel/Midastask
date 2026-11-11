/**
 * OfficeTask / Midas Task Management
 * Mock Data Store with LocalStorage Persistence
 */

const STORAGE_KEYS = {
  TASKS: 'midastask_notes_list',
  DEVICES: 'midastask_active_users',
  AUTH: 'midastask_auth_session',
  FILTER: 'midastask_active_filter',
  HISTORY_MODE: 'midastask_history_mode'
};

const DEFAULT_DEVICES = [
  {
    id: 'OFFICE-PC-01',
    name: 'Main HP Laptop',
    numBadge: '1',
    department: 'Workstation 1',
    user: 'Main HP Laptop',
    isPoweredOn: true,
    lastPingTime: Date.now() - (30 * 1000), // Active (pinged 30s ago)
    stuckThresholdMinutes: 30
  },
  {
    id: 'OFFICE-PC-02',
    name: 'Grey Laptop',
    numBadge: '2',
    department: 'Workstation 2',
    user: 'Grey Laptop',
    isPoweredOn: true,
    lastPingTime: Date.now() - (90 * 1000), // Active (pinged 90s ago)
    stuckThresholdMinutes: 30
  },
  {
    id: 'OFFICE-PC-03',
    name: "Ghanshyam's Laptop",
    numBadge: '3',
    department: 'Workstation 3',
    user: "Ghanshyam's Laptop",
    isPoweredOn: false, // Inactive / PC Powered Off
    lastPingTime: Date.now() - (3 * 3600 * 1000), // 3 hours ago
    stuckThresholdMinutes: 30
  }
];

const DEFAULT_NOTES = [
  // OFFICE-PC-01 Notes (Normal duration: started 6 mins ago)
  {
    id: 'note-101',
    deviceId: 'OFFICE-PC-01',
    title: 'Quarterly Vendor Invoices Audit',
    category: 'Finance',
    completed: false,
    priority: 'urgent',
    timeframe: 'This Month',
    startedAt: Date.now() - (6 * 60 * 1000),
    createdAt: new Date(Date.now() - (6 * 60 * 1000)).toISOString()
  },
  {
    id: 'note-102',
    deviceId: 'OFFICE-PC-01',
    title: 'Verify payroll ledger & export timesheets',
    category: 'Operations',
    completed: true,
    priority: 'high',
    timeframe: 'This Month',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'note-103',
    deviceId: 'OFFICE-PC-01',
    title: 'Submit monthly utility reimbursement',
    category: 'Accounting',
    completed: false,
    priority: 'medium',
    timeframe: 'This Month',
    startedAt: Date.now() - (15 * 60 * 1000),
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'note-104',
    deviceId: 'OFFICE-PC-01',
    title: 'Archive Q1 fiscal invoices',
    category: 'Archive',
    completed: true,
    priority: 'low',
    timeframe: 'History',
    createdAt: new Date(Date.now() - 2592000000).toISOString()
  },
  {
    id: 'note-105',
    deviceId: 'OFFICE-PC-01',
    title: 'Review employee travel & meal expense claims',
    category: 'Finance',
    completed: false,
    priority: 'medium',
    timeframe: 'This Month',
    startedAt: Date.now() - (10 * 60 * 1000),
    createdAt: new Date().toISOString()
  },
  {
    id: 'note-106',
    deviceId: 'OFFICE-PC-01',
    title: 'Reconcile corporate bank merchant statements',
    category: 'Banking',
    completed: false,
    priority: 'low',
    timeframe: 'This Month',
    startedAt: Date.now() - (5 * 60 * 1000),
    createdAt: new Date().toISOString()
  },

  // OFFICE-PC-02 Notes (Stuck in task: started 58 mins ago -> exceeds 30m threshold!)
  {
    id: 'note-201',
    deviceId: 'OFFICE-PC-02',
    title: 'Deploy hotfix for authentication refresh token',
    category: 'Engineering',
    completed: false,
    priority: 'urgent',
    timeframe: 'This Month',
    startedAt: Date.now() - (58 * 60 * 1000), // 58 minutes elapsed -> STUCK!
    createdAt: new Date(Date.now() - (58 * 60 * 1000)).toISOString()
  },
  {
    id: 'note-202',
    deviceId: 'OFFICE-PC-02',
    title: 'Optimize database compound indexes',
    category: 'Database',
    completed: true,
    priority: 'high',
    timeframe: 'This Month',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'note-203',
    deviceId: 'OFFICE-PC-02',
    title: 'Desktop widget Electron bridge code review',
    category: 'Review',
    completed: false,
    priority: 'medium',
    timeframe: 'This Month',
    createdAt: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 'note-204',
    deviceId: 'OFFICE-PC-02',
    title: 'Legacy API deprecation notice dispatch',
    category: 'Docs',
    completed: true,
    priority: 'low',
    timeframe: 'History',
    createdAt: new Date(Date.now() - 3000000000).toISOString()
  },
  {
    id: 'note-205',
    deviceId: 'OFFICE-PC-02',
    title: 'Setup telemetry health-check monitoring probe',
    category: 'DevOps',
    completed: false,
    priority: 'high',
    timeframe: 'This Month',
    createdAt: new Date().toISOString()
  },
  {
    id: 'note-206',
    deviceId: 'OFFICE-PC-02',
    title: 'Implement automated WorkerW window recovery test',
    category: 'QA',
    completed: false,
    priority: 'low',
    timeframe: 'This Month',
    createdAt: new Date().toISOString()
  },

  // OFFICE-PC-03 Notes
  {
    id: 'note-301',
    deviceId: 'OFFICE-PC-03',
    title: 'Resolve Priority Support Ticket #8841 (Acme Corp)',
    category: 'Support',
    completed: false,
    priority: 'urgent',
    timeframe: 'This Month',
    createdAt: new Date().toISOString()
  },
  {
    id: 'note-302',
    deviceId: 'OFFICE-PC-03',
    title: 'Customer onboarding walkthrough call (Apex Logistics)',
    category: 'Success',
    completed: false,
    priority: 'high',
    timeframe: 'This Month',
    createdAt: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'note-303',
    deviceId: 'OFFICE-PC-03',
    title: 'Update Windows widget FAQ in support portal',
    category: 'Documentation',
    completed: true,
    priority: 'medium',
    timeframe: 'This Month',
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'note-304',
    deviceId: 'OFFICE-PC-03',
    title: 'Weekly satisfaction NPS report generation',
    category: 'Metrics',
    completed: true,
    priority: 'low',
    timeframe: 'History',
    createdAt: new Date(Date.now() - 2500000000).toISOString()
  },
  {
    id: 'note-305',
    deviceId: 'OFFICE-PC-03',
    title: 'Follow up on unassigned enterprise inbound leads',
    category: 'Sales',
    completed: false,
    priority: 'medium',
    timeframe: 'This Month',
    createdAt: new Date().toISOString()
  },
  {
    id: 'note-306',
    deviceId: 'OFFICE-PC-03',
    title: 'Respond to Zendesk billing questions queue',
    category: 'Support',
    completed: false,
    priority: 'low',
    timeframe: 'This Month',
    createdAt: new Date().toISOString()
  },
  {
    id: 'note-307',
    deviceId: 'OFFICE-PC-03',
    title: 'Customer NPS weekly survey analysis',
    category: 'Reporting',
    completed: true,
    priority: 'low',
    timeframe: 'History',
    createdAt: new Date(Date.now() - 3600000000).toISOString()
  }
];

// Cross-tab and live sync broadcast channel
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('midastask_live_sync') : null;

function broadcastSync(eventType, payload) {
  if (syncChannel) {
    syncChannel.postMessage({ type: eventType, payload, timestamp: Date.now() });
  }
}

function resolveApiBase() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname || '';
  const port = window.location.port || '';
  // Use same-origin relative API when hosted on Cloudflare Workers / Pages or local Wrangler dev (8787)
  if (host.endsWith('.workers.dev') || host.endsWith('.pages.dev') || port === '8787') {
    return '';
  }
  return 'https://midastask.shreypatel00557.workers.dev';
}

const API_BASE = resolveApiBase();

// Helper methods to read/write from localStorage + Cloud Sync
const DataStore = {
  syncChannel,
  API_BASE,
  clockOffsetMs: 0,
  lastCloudHash: '',
  isCloudConnected: false,
  _listeners: [],

  onCloudSync(callback) {
    if (typeof callback === 'function') {
      this._listeners.push(callback);
    }
  },

  _notifyCloudListeners(reason) {
    this._listeners.forEach(fn => {
      try { fn(reason); } catch (e) { /* ignore */ }
    });
  },

  async syncFromCloud(deviceId = 'ALL') {
    try {
      const res = await fetch(`${API_BASE}/api/state?deviceId=${encodeURIComponent(deviceId)}&_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || !data.ok) return false;

      if (typeof data.serverTime === 'number') {
        this.clockOffsetMs = data.serverTime - Date.now();
      }
      this.isCloudConnected = true;

      let changed = false;

      if (Array.isArray(data.devices) && data.devices.length > 0) {
        const nextDevJson = JSON.stringify(data.devices);
        if (localStorage.getItem(STORAGE_KEYS.DEVICES) !== nextDevJson) {
          localStorage.setItem(STORAGE_KEYS.DEVICES, nextDevJson);
          changed = true;
        }
      }

      if (Array.isArray(data.tasks)) {
        if (deviceId === 'ALL') {
          const nextTasksJson = JSON.stringify(data.tasks);
          if (localStorage.getItem(STORAGE_KEYS.TASKS) !== nextTasksJson) {
            localStorage.setItem(STORAGE_KEYS.TASKS, nextTasksJson);
            changed = true;
          }
        } else {
          // Merge device-specific tasks into local cache
          const current = this.getNotes().filter(n => n.deviceId !== deviceId);
          const merged = [...data.tasks, ...current];
          const nextTasksJson = JSON.stringify(merged);
          if (localStorage.getItem(STORAGE_KEYS.TASKS) !== nextTasksJson) {
            localStorage.setItem(STORAGE_KEYS.TASKS, nextTasksJson);
            changed = true;
          }
        }
      }

      if (changed) {
        broadcastSync('CLOUD_SYNC', { deviceId });
        this._notifyCloudListeners('cloud-sync');
      }
      return true;
    } catch (err) {
      this.isCloudConnected = false;
      return false;
    }
  },

  async sendHeartbeat(deviceId, isPoweredOn = true) {
    if (!deviceId) return false;
    try {
      const res = await fetch(`${API_BASE}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          isPoweredOn,
          hostname: typeof navigator !== 'undefined' ? (navigator.platform || 'WebClient') : 'WebClient'
        })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.ok && data.device) {
        const devices = this.getDevices();
        const idx = devices.findIndex(d => d.id === data.device.id);
        if (idx !== -1) {
          devices[idx] = data.device;
          this.setDevices(devices);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  sendOfflineBeacon(deviceId) {
    if (!deviceId || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    try {
      const blob = new Blob([JSON.stringify({ deviceId, isPoweredOn: false })], {
        type: 'application/json'
      });
      navigator.sendBeacon(`${API_BASE}/api/heartbeat`, blob);
    } catch (e) { /* ignore */ }
  },

  getNotes() {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      this.setNotes(DEFAULT_NOTES);
      return DEFAULT_NOTES;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_NOTES;
    }
  },

  setNotes(notes) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(notes));
    broadcastSync('NOTES_UPDATED', notes);
  },

  getDevices() {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICES);
    if (!raw) {
      this.setDevices(DEFAULT_DEVICES);
      return DEFAULT_DEVICES;
    }
    try {
      const parsed = JSON.parse(raw);
      // Ensure all devices have required time-analysis properties
      let updated = false;
      parsed.forEach((d, idx) => {
        const defaultD = DEFAULT_DEVICES[idx] || DEFAULT_DEVICES[0];
        if (d.isPoweredOn === undefined) {
          d.isPoweredOn = defaultD.isPoweredOn;
          d.lastPingTime = defaultD.lastPingTime;
          d.stuckThresholdMinutes = defaultD.stuckThresholdMinutes || 30;
          d.numBadge = String(idx + 1);
          updated = true;
        }
      });
      if (updated) this.setDevices(parsed);
      return parsed;
    } catch (e) {
      return DEFAULT_DEVICES;
    }
  },

  setDevices(devices) {
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    broadcastSync('DEVICES_UPDATED', devices);
  },

  // Auto-analyze device performance based on time & active/inactive status
  autoAnalyzeDevice(deviceId) {
    const devices = this.getDevices();
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return null;

    const now = Date.now() + (this.clockOffsetMs || 0);
    const lastPing = dev.lastPingTime || 0;
    // Laptop is considered online if powered on AND pinged within last 2 minutes
    const isOnline = dev.isPoweredOn !== false && lastPing > 0 && (now - lastPing) < (2 * 60 * 1000);

    // 1. If PC is powered off / offline (inactive)
    if (!isOnline) {
      const mins = lastPing > 0 ? Math.max(1, Math.floor((now - lastPing) / 60000)) : 999;
      const hours = Math.floor(mins / 60);
      const timeStr = lastPing <= 0 ? 'never' : (hours > 0 ? `${hours}h ago` : `${mins}m ago`);
      return {
        deviceId,
        status: 'offline',
        performanceStatus: 'offline',
        rgbColor: 'red',
        tagText: 'PC Powered Off (Inactive)',
        footerText: 'PC Offline',
        tagDetail: `Workstation is offline (Inactive • Last ping ${timeStr})`,
        isStuck: false,
        stuckTaskId: null
      };
    }

    // 2. PC is online, check pending tasks for time bottlenecks (> threshold)
    const allNotes = this.getNotes();
    const pendingNotes = allNotes.filter(n => n.deviceId === deviceId && !n.completed);
    const threshold = dev.stuckThresholdMinutes || 30;

    let stuckNote = null;
    let maxElapsedMinutes = 0;

    for (const note of pendingNotes) {
      const startTime = note.startedAt || new Date(note.createdAt).getTime();
      const elapsed = Math.floor((now - startTime) / 60000);
      if (elapsed >= threshold && elapsed > maxElapsedMinutes) {
        maxElapsedMinutes = elapsed;
        stuckNote = note;
      }
    }

    if (stuckNote) {
      const hours = Math.floor(maxElapsedMinutes / 60);
      const mins = maxElapsedMinutes % 60;
      const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${maxElapsedMinutes}m`;
      return {
        deviceId,
        status: 'warning',
        performanceStatus: 'stuck',
        rgbColor: 'yellow',
        tagText: `Stuck in task (${durationStr})`,
        footerText: 'Stuck (Bottleneck)',
        tagDetail: `Taking too much time on: "${stuckNote.title}" (> ${threshold}m limit)`,
        isStuck: true,
        stuckTaskId: stuckNote.id,
        elapsedDuration: durationStr
      };
    }

    // 3. Normal performance (Good)
    return {
      deviceId,
      status: 'online',
      performanceStatus: 'good',
      rgbColor: 'green',
      tagText: 'Working Good (Active)',
      footerText: 'Online & Active',
      tagDetail: 'Workstation responsive • Tasks progressing on schedule',
      isStuck: false,
      stuckTaskId: null
    };
  },

  cycleDeviceStatus(deviceId) {
    // Disabled: Status is driven strictly by real-time laptop heartbeats & task timestamps.
    return this.autoAnalyzeDevice(deviceId);
  },

  addNote(note) {
    const notes = this.getNotes();
    const now = Date.now();
    const newNote = {
      id: 'note-' + now + '-' + Math.floor(Math.random() * 1000),
      completed: false,
      startedAt: now,
      createdAt: new Date(now).toISOString(),
      timeframe: 'This Month',
      ...note
    };
    notes.unshift(newNote);
    this.setNotes(notes);

    fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    }).then(() => this.syncFromCloud()).catch(() => {});

    return newNote;
  },

  updateNote(id, updates) {
    const notes = this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates };
      this.setNotes(notes);

      fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(() => this.syncFromCloud()).catch(() => {});

      return notes[index];
    }
    return null;
  },

  toggleNoteCompletion(id) {
    const notes = this.getNotes();
    const note = notes.find(n => n.id === id);
    if (note) {
      note.completed = !note.completed;
      if (!note.completed) {
        note.startedAt = Date.now();
      }
      this.setNotes(notes);

      fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(() => this.syncFromCloud()).catch(() => {});

      return note;
    }
    return null;
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    this.setNotes(notes);

    fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).then(() => this.syncFromCloud()).catch(() => {});
  },

  resetDefaults() {
    this.setNotes(DEFAULT_NOTES);
    this.setDevices(DEFAULT_DEVICES);
    localStorage.removeItem(STORAGE_KEYS.FILTER);
    localStorage.removeItem(STORAGE_KEYS.HISTORY_MODE);
  }
};

window.DataStore = DataStore;
