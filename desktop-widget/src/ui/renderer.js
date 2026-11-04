// State
let tasks = [];
let currentFilter = 'today';
let isLocked = true;
let currentConfig = { deviceId: 'OFFICE-PC-01', serverUrl: 'http://localhost:5555' };

// DOM Elements
const widgetContainer = document.getElementById('widgetContainer');
const deviceTag = document.getElementById('deviceTag');
const syncCaption = document.getElementById('syncCaption');
const statusDot = document.getElementById('statusDot');
const lockToggleBtn = document.getElementById('lockToggleBtn');
const lockIconLocked = document.getElementById('lockIconLocked');
const lockIconUnlocked = document.getElementById('lockIconUnlocked');
const lockLabel = document.getElementById('lockLabel');
const unlockedControls = document.getElementById('unlockedControls');
const dragHandleBar = document.getElementById('dragHandleBar');
const settingsBtn = document.getElementById('settingsBtn');
const closeBtn = document.getElementById('closeBtn');

const countToday = document.getElementById('countToday');
const countPending = document.getElementById('countPending');
const countCompleted = document.getElementById('countCompleted');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const progressSummary = document.getElementById('progressSummary');
const progressBar = document.getElementById('progressBar');
const queueNotice = document.getElementById('queueNotice');

// Modals
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const authError = document.getElementById('authError');
const authModalClose = document.getElementById('authModalClose');
const authCancelBtn = document.getElementById('authCancelBtn');

const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const configDeviceId = document.getElementById('configDeviceId');
const configServerUrl = document.getElementById('configServerUrl');
const settingsModalClose = document.getElementById('settingsModalClose');
const settingsCancelBtn = document.getElementById('settingsCancelBtn');

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
async function init() {
  setupFilterTabs();
  setupAuthEvents();
  setupSettingsEvents();
  setupDragEvents();

  // Get initial lock status and config
  const status = await window.officeTaskApi.getLockStatus();
  isLocked = status.isLocked;
  currentConfig = status.config;
  deviceTag.textContent = currentConfig.deviceId;
  updateLockUI(isLocked);

  // Get initial tasks
  tasks = await window.officeTaskApi.getTasks();
  renderTasks();

  // Setup Listeners from main process
  window.officeTaskApi.onTasksUpdated((updatedTasks) => {
    tasks = updatedTasks;
    renderTasks();
  });

  window.officeTaskApi.onSyncStatus((sync) => {
    updateSyncUI(sync);
  });

  window.officeTaskApi.onLockStatusChanged((locked) => {
    isLocked = locked;
    updateLockUI(isLocked);
  });
}

// ----------------------------------------------------
// Task Filtering & Rendering
// ----------------------------------------------------
function isDueTodayOrOverdue(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  
  // End of today
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return d <= endOfToday;
}

function getFilteredTasks() {
  if (currentFilter === 'today') {
    return tasks.filter(t => t.status === 'pending' && (isDueTodayOrOverdue(t.dueDate) || t.priority === 'urgent'));
  }
  if (currentFilter === 'pending') {
    return tasks.filter(t => t.status === 'pending');
  }
  if (currentFilter === 'completed') {
    return tasks.filter(t => t.status === 'completed');
  }
  return tasks;
}

function renderTasks() {
  const todayTasks = tasks.filter(t => t.status === 'pending' && (isDueTodayOrOverdue(t.dueDate) || t.priority === 'urgent'));
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Update counts in tab pills
  countToday.textContent = todayTasks.length;
  countPending.textContent = pendingTasks.length;
  countCompleted.textContent = completedTasks.length;

  // Update Progress Bar
  const total = tasks.length;
  const completed = completedTasks.length;
  progressSummary.textContent = `${completed}/${total} completed`;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  progressBar.style.width = `${percent}%`;

  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    filtered.forEach(task => {
      const card = createTaskCard(task);
      taskList.appendChild(card);
    });
  }
}

function createTaskCard(task) {
  const isDone = task.status === 'completed';
  const card = document.createElement('div');
  card.className = `task-card priority-${task.priority || 'medium'} ${isDone ? 'completed' : ''}`;
  card.dataset.id = task._id;

  // Due Date label
  let dueHtml = '';
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    const now = new Date();
    const isOverdue = !isDone && d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = !isDone && !isOverdue && isDueTodayOrOverdue(task.dueDate);

    let dueClass = isOverdue ? 'overdue' : (isToday ? 'today' : '');
    let label = isOverdue ? 'Overdue' : (isToday ? 'Due Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    
    dueHtml = `
      <span class="due-badge ${dueClass}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${label}
      </span>
    `;
  }

  card.innerHTML = `
    <div class="task-checkbox-container">
      <div class="custom-checkbox" title="${isDone ? 'Mark as pending' : 'Mark as complete'}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </div>
    <div class="task-content">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-meta">
        <span class="priority-badge ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
        ${dueHtml}
      </div>
    </div>
  `;

  // Toggle Checkbox Click
  const checkbox = card.querySelector('.custom-checkbox');
  checkbox.addEventListener('click', async (e) => {
    e.stopPropagation();
    // Optimistic UI toggle
    card.classList.toggle('completed');
    await window.officeTaskApi.toggleTask(task._id);
  });

  return card;
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

// ----------------------------------------------------
// Filter Tabs
// ----------------------------------------------------
function setupFilterTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderTasks();
    });
  });
}

// ----------------------------------------------------
// Lock & Unlock UI Handling
// ----------------------------------------------------
function updateLockUI(locked) {
  if (locked) {
    widgetContainer.classList.remove('unlocked-mode');
    lockIconLocked.style.display = 'block';
    lockIconUnlocked.style.display = 'none';
    lockLabel.textContent = 'Locked';
    lockToggleBtn.classList.remove('unlocked');
    unlockedControls.style.display = 'none';
    dragHandleBar.style.display = 'none';
  } else {
    widgetContainer.classList.add('unlocked-mode');
    lockIconLocked.style.display = 'none';
    lockIconUnlocked.style.display = 'block';
    lockLabel.textContent = 'Unlocked';
    lockToggleBtn.classList.add('unlocked');
    unlockedControls.style.display = 'flex';
    dragHandleBar.style.display = 'flex';
  }
}

function updateSyncUI(sync) {
  if (sync.state === 'online') {
    statusDot.className = 'status-indicator-dot online';
    statusDot.title = 'Synchronized with office server';
    syncCaption.textContent = sync.message || 'Synced live';
  } else if (sync.state === 'offline') {
    statusDot.className = 'status-indicator-dot offline';
    statusDot.title = 'Operating in offline cached mode';
    syncCaption.textContent = sync.message || 'Offline mode';
  } else {
    statusDot.className = 'status-indicator-dot';
    syncCaption.textContent = sync.message || 'Connecting...';
  }

  if (sync.queueCount && sync.queueCount > 0) {
    queueNotice.style.display = 'inline';
    queueNotice.textContent = `${sync.queueCount} offline change(s) queued`;
  } else {
    queueNotice.style.display = 'none';
  }
}

// ----------------------------------------------------
// Authentication Modal & Lock Controls
// ----------------------------------------------------
function setupAuthEvents() {
  lockToggleBtn.addEventListener('click', async () => {
    if (isLocked) {
      // Open password modal
      adminPasswordInput.value = '';
      authError.style.display = 'none';
      authModal.style.display = 'flex';
      adminPasswordInput.focus();
    } else {
      // Re-lock
      await window.officeTaskApi.lockAdmin();
    }
  });

  authModalClose.addEventListener('click', () => {
    authModal.style.display = 'none';
  });

  authCancelBtn.addEventListener('click', () => {
    authModal.style.display = 'none';
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = adminPasswordInput.value;
    authError.style.display = 'none';

    try {
      const res = await window.officeTaskApi.unlockAdmin(password);
      if (res.success && res.isUnlocked) {
        authModal.style.display = 'none';
      } else {
        authError.textContent = res.error || 'Incorrect administrator password';
        authError.style.display = 'block';
      }
    } catch (err) {
      authError.textContent = 'Authentication service error';
      authError.style.display = 'block';
    }
  });

  // Authenticated Window Close Button
  closeBtn.addEventListener('click', async () => {
    if (!isLocked) {
      const confirmClose = confirm('Are you sure you want to close this OfficeTask widget?');
      if (confirmClose) {
        await window.officeTaskApi.closeWidget();
      }
    }
  });
}

// ----------------------------------------------------
// Settings Modal
// ----------------------------------------------------
function setupSettingsEvents() {
  settingsBtn.addEventListener('click', () => {
    if (isLocked) return;
    configDeviceId.value = currentConfig.deviceId || 'OFFICE-PC-01';
    configServerUrl.value = currentConfig.serverUrl || 'http://localhost:5555';
    settingsModal.style.display = 'flex';
  });

  settingsModalClose.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsCancelBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newDeviceId = configDeviceId.value;
    const newServerUrl = configServerUrl.value;

    try {
      const res = await window.officeTaskApi.saveConfig({
        deviceId: newDeviceId,
        serverUrl: newServerUrl
      });
      if (res.success) {
        currentConfig = res.config;
        deviceTag.textContent = currentConfig.deviceId;
        settingsModal.style.display = 'none';
      }
    } catch (err) {
      alert(err.message || 'Failed to save configuration');
    }
  });
}

// ----------------------------------------------------
// Drag Repositioning (Only when Unlocked)
// ----------------------------------------------------
function setupDragEvents() {
  let isDragging = false;
  let startMouseX = 0;
  let startMouseY = 0;

  dragHandleBar.addEventListener('mousedown', (e) => {
    if (isLocked) return;
    isDragging = true;
    startMouseX = e.screenX;
    startMouseY = e.screenY;
    window.officeTaskApi.startWindowDrag();

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      const dx = moveEvent.screenX - startMouseX;
      const dy = moveEvent.screenY - startMouseY;
      window.officeTaskApi.moveWindowDelta(dx, dy);
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// Start app
window.addEventListener('DOMContentLoaded', init);
