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

// Helper methods to read/write from localStorage
const DataStore = {
  syncChannel,

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

    const now = Date.now();
    const lastPing = dev.lastPingTime || now;
    const isOnline = dev.isPoweredOn !== false && (now - lastPing) < (15 * 60 * 1000);

    // 1. If PC is powered off / offline (inactive)
    if (!isOnline) {
      const mins = Math.max(1, Math.floor((now - lastPing) / 60000));
      const hours = Math.floor(mins / 60);
      const timeStr = hours > 0 ? `${hours}h ago` : `${mins}m ago`;
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
    const devices = this.getDevices();
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    const notes = this.getNotes();
    const pendingForDev = notes.filter(n => n.deviceId === deviceId && !n.completed);
    const currentAnalysis = this.autoAnalyzeDevice(deviceId);

    if (currentAnalysis.rgbColor === 'green') {
      // Simulate: Stuck in task (> 45m elapsed)
      dev.isPoweredOn = true;
      dev.lastPingTime = Date.now();
      if (pendingForDev.length > 0) {
        pendingForDev[0].startedAt = Date.now() - (55 * 60 * 1000); // 55 mins ago!
        this.setNotes(notes);
      }
    } else if (currentAnalysis.rgbColor === 'yellow') {
      // Simulate: PC Powered Off (Inactive)
      dev.isPoweredOn = false;
      dev.lastPingTime = Date.now() - (4 * 3600 * 1000); // 4 hours ago
    } else {
      // Simulate: Back to Normal / Good
      dev.isPoweredOn = true;
      dev.lastPingTime = Date.now();
      if (pendingForDev.length > 0) {
        pendingForDev[0].startedAt = Date.now() - (5 * 60 * 1000); // 5 mins ago
        this.setNotes(notes);
      }
    }

    this.setDevices(devices);
    return this.autoAnalyzeDevice(deviceId);
  },

  addNote(note) {
    const notes = this.getNotes();
    const newNote = {
      id: 'note-' + Date.now(),
      completed: false,
      createdAt: new Date().toISOString(),
      timeframe: 'This Month',
      ...note
    };
    notes.unshift(newNote);
    this.setNotes(notes);
    return newNote;
  },

  updateNote(id, updates) {
    const notes = this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates };
      this.setNotes(notes);
      return notes[index];
    }
    return null;
  },

  toggleNoteCompletion(id) {
    const notes = this.getNotes();
    const note = notes.find(n => n.id === id);
    if (note) {
      note.completed = !note.completed;
      this.setNotes(notes);
      return note;
    }
    return null;
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    this.setNotes(notes);
  },

  resetDefaults() {
    this.setNotes(DEFAULT_NOTES);
    this.setDevices(DEFAULT_DEVICES);
    localStorage.removeItem(STORAGE_KEYS.FILTER);
    localStorage.removeItem(STORAGE_KEYS.HISTORY_MODE);
  }
};

window.DataStore = DataStore;
