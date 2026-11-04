// State
let currentUser = null;
let devices = [];
let tasks = [];
let selectedDeviceId = 'ALL'; // 'ALL' or 'OFFICE-PC-01', etc.
let selectedStatus = 'all';   // 'all', 'pending', 'completed'

// DOM Elements
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const liveDot = document.getElementById('liveDot');
const socketStatusText = document.getElementById('socketStatusText');

const statPending = document.getElementById('statPending');
const statCompleted = document.getElementById('statCompleted');
const statOverdue = document.getElementById('statOverdue');

const devicesList = document.getElementById('devicesList');
const currentDeviceChip = document.getElementById('currentDeviceChip');
const resetDeviceFilterBtn = document.getElementById('resetDeviceFilterBtn');

const taskStream = document.getElementById('taskStream');
const emptyTasksNotice = document.getElementById('emptyTasksNotice');

const fabNewTask = document.getElementById('fabNewTask');
const openNewTaskBtn = document.getElementById('openNewTaskBtn');
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const taskModalTitle = document.getElementById('taskModalTitle');
const taskEditId = document.getElementById('taskEditId');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDescInput = document.getElementById('taskDescInput');
const taskPriorityInput = document.getElementById('taskPriorityInput');
const taskDueInput = document.getElementById('taskDueInput');
const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
const cancelTaskModalBtn = document.getElementById('cancelTaskModalBtn');

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupSocketListeners();

  if (window.api.isAuthenticated()) {
    try {
      const userRes = await window.api.getMe();
      if (userRes.success) {
        currentUser = userRes.user;
        showDashboard();
        return;
      }
    } catch (err) {
      console.log('Session check failed, showing login');
    }
  }

  showLogin();
});

function showLogin() {
  loginView.style.display = 'flex';
  dashboardView.style.display = 'none';
  window.socketManager.disconnect();
}

async function showDashboard() {
  loginView.style.display = 'none';
  dashboardView.style.display = 'flex';

  window.socketManager.connect();
  await refreshDashboardData();
}

async function refreshDashboardData() {
  try {
    await Promise.all([
      loadMetrics(),
      loadDevices(),
      loadTasks()
    ]);
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

// ----------------------------------------------------
// Event Listeners Setup
// ----------------------------------------------------
function setupEventListeners() {
  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    loginBtn.disabled = true;

    try {
      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      const res = await window.api.login(email, password);
      currentUser = res.user;
      showDashboard();
    } catch (err) {
      loginError.textContent = err.message || 'Login failed. Check credentials.';
      loginError.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    window.api.logout();
    showLogin();
  });

  window.addEventListener('auth:expired', () => {
    showLogin();
  });

  // Reset device filter
  resetDeviceFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterByDevice('ALL');
  });

  // Segmented control status filter
  const segButtons = document.querySelectorAll('.seg-btn');
  segButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      segButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStatus = btn.dataset.status;
      loadTasks();
    });
  });

  // New task buttons
  const openCreateModal = () => {
    taskEditId.value = '';
    taskModalTitle.textContent = 'Create New Task';
    taskForm.reset();

    // Default assigned device radio
    const targetDevice = selectedDeviceId !== 'ALL' ? selectedDeviceId : 'OFFICE-PC-01';
    const radio = document.querySelector(`input[name="assignedDevice"][value="${targetDevice}"]`);
    if (radio) radio.checked = true;

    // Default due date to today
    const todayStr = new Date().toISOString().split('T')[0];
    taskDueInput.value = todayStr;

    taskModal.style.display = 'flex';
  };

  openNewTaskBtn.addEventListener('click', openCreateModal);
  fabNewTask.addEventListener('click', openCreateModal);

  closeTaskModalBtn.addEventListener('click', () => {
    taskModal.style.display = 'none';
  });

  cancelTaskModalBtn.addEventListener('click', () => {
    taskModal.style.display = 'none';
  });

  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
      taskModal.style.display = 'none';
    }
  });

  // Save task
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = taskEditId.value;
    const deviceId = document.querySelector('input[name="assignedDevice"]:checked').value;
    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const priority = taskPriorityInput.value;
    const dueDate = taskDueInput.value ? new Date(taskDueInput.value).toISOString() : null;

    try {
      if (id) {
        // Edit
        await window.api.updateTask(id, {
          deviceId,
          title,
          description,
          priority,
          dueDate
        });
      } else {
        // Create
        await window.api.createTask({
          deviceId,
          title,
          description,
          priority,
          dueDate
        });
      }
      taskModal.style.display = 'none';
      await refreshDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to save task');
    }
  });
}

// ----------------------------------------------------
// Real-Time Socket Listeners
// ----------------------------------------------------
function setupSocketListeners() {
  window.addEventListener('socket:connection-changed', (e) => {
    if (e.detail.online) {
      liveDot.className = 'live-dot online';
      socketStatusText.textContent = 'Live Connected';
    } else {
      liveDot.className = 'live-dot';
      socketStatusText.textContent = 'Offline (reconnecting)';
    }
  });

  window.addEventListener('socket:device-status', (e) => {
    const { deviceId, status, lastSeen } = e.detail;
    const dev = devices.find(d => d.deviceId === deviceId);
    if (dev) {
      dev.status = status;
      dev.lastSeen = lastSeen;
      renderDevices();
    }
  });

  window.addEventListener('socket:task-created', (e) => {
    const newTask = e.detail;
    // Check if task belongs in current view
    if (selectedDeviceId === 'ALL' || selectedDeviceId === newTask.deviceId) {
      const existing = tasks.find(t => t._id === newTask._id);
      if (!existing) {
        tasks.unshift(newTask);
        renderTasks();
      }
    }
    loadMetrics();
    loadDevices();
  });

  window.addEventListener('socket:task-updated', (e) => {
    const updated = e.detail;
    const index = tasks.findIndex(t => t._id === updated._id);
    if (index >= 0) {
      if (selectedDeviceId !== 'ALL' && updated.deviceId !== selectedDeviceId) {
        tasks.splice(index, 1);
      } else {
        tasks[index] = updated;
      }
      renderTasks();
    } else if (selectedDeviceId === 'ALL' || selectedDeviceId === updated.deviceId) {
      tasks.unshift(updated);
      renderTasks();
    }
    loadMetrics();
    loadDevices();
  });

  window.addEventListener('socket:task-toggled', (e) => {
    const toggled = e.detail;
    const task = tasks.find(t => t._id === toggled._id);
    if (task) {
      task.status = toggled.status;
      task.completedAt = toggled.completedAt;
      renderTasks();
    }
    loadMetrics();
    loadDevices();
  });

  window.addEventListener('socket:task-deleted', (e) => {
    const { taskId } = e.detail;
    tasks = tasks.filter(t => t._id !== taskId);
    renderTasks();
    loadMetrics();
    loadDevices();
  });
}

// ----------------------------------------------------
// Data Loaders & Renderers
// ----------------------------------------------------
async function loadMetrics() {
  try {
    const res = await window.api.getMetrics();
    if (res.success && res.metrics) {
      statPending.textContent = res.metrics.totalPending;
      statCompleted.textContent = res.metrics.totalCompleted;
      statOverdue.textContent = res.metrics.totalOverdue;
    }
  } catch (e) {
    console.error('Error loading metrics:', e);
  }
}

async function loadDevices() {
  try {
    const res = await window.api.getDevices();
    if (res.success && Array.isArray(res.devices)) {
      devices = res.devices;
      renderDevices();
    }
  } catch (e) {
    console.error('Error loading devices:', e);
  }
}

function renderDevices() {
  devicesList.innerHTML = '';

  devices.forEach(dev => {
    const isSelected = selectedDeviceId === dev.deviceId;
    const card = document.createElement('div');
    card.className = `device-card ${isSelected ? 'active-selected' : ''}`;
    card.onclick = () => filterByDevice(isSelected ? 'ALL' : dev.deviceId);

    const isOnline = dev.status === 'online';
    const stats = dev.stats || { pending: 0, completed: 0, overdue: 0 };

    card.innerHTML = `
      <div class="device-card-header">
        <span class="device-id-title">${dev.deviceId}</span>
        <span class="device-status-pill ${isOnline ? 'online' : 'offline'}">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: currentColor;"></span>
          ${isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <div class="device-name-sub">${escapeHtml(dev.name)}</div>
      <div class="device-stats-bar">
        <div class="stat-item">
          <span class="stat-val">${stats.pending}</span>
          <span class="stat-lbl">Pending</span>
        </div>
        <div class="stat-item">
          <span class="stat-val" style="color: #34d399;">${stats.completed}</span>
          <span class="stat-lbl">Done</span>
        </div>
        <div class="stat-item">
          <span class="stat-val" style="color: ${stats.overdue > 0 ? '#f87171' : 'inherit'};">${stats.overdue}</span>
          <span class="stat-lbl">Overdue</span>
        </div>
      </div>
    `;

    devicesList.appendChild(card);
  });
}

function filterByDevice(deviceId) {
  selectedDeviceId = deviceId;
  const chipText = currentDeviceChip.querySelector('.chip-text');

  if (deviceId === 'ALL') {
    chipText.textContent = 'All Devices';
    resetDeviceFilterBtn.style.display = 'none';
  } else {
    chipText.textContent = `Filtered: ${deviceId}`;
    resetDeviceFilterBtn.style.display = 'inline-flex';
  }

  renderDevices();
  loadTasks();
}

async function loadTasks() {
  try {
    const params = {
      deviceId: selectedDeviceId !== 'ALL' ? selectedDeviceId : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined
    };
    const res = await window.api.getTasks(params);
    if (res.success && Array.isArray(res.tasks)) {
      tasks = res.tasks;
      renderTasks();
    }
  } catch (e) {
    console.error('Error loading tasks:', e);
  }
}

function renderTasks() {
  taskStream.innerHTML = '';

  if (tasks.length === 0) {
    emptyTasksNotice.style.display = 'block';
    return;
  }

  emptyTasksNotice.style.display = 'none';

  tasks.forEach(task => {
    const isDone = task.status === 'completed';
    const card = document.createElement('div');
    card.className = `admin-task-card ${isDone ? 'is-done' : ''}`;
    card.dataset.id = task._id;

    // Due date format & alerts
    let dueHtml = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const now = new Date();
      const isOverdue = !isDone && d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isToday = !isDone && !isOverdue && d.toDateString() === now.toDateString();

      let dueClass = isOverdue ? 'overdue' : (isToday ? 'today' : '');
      let label = isOverdue ? 'Overdue' : (isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' }));

      dueHtml = `
        <span class="due-date-pill ${dueClass}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${label}
        </span>
      `;
    }

    card.innerHTML = `
      <div class="admin-checkbox" title="${isDone ? 'Mark as pending' : 'Mark as complete'}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>

      <div class="admin-task-body">
        <div class="admin-task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="admin-task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="admin-task-footer">
          <span class="assigned-pill">${task.deviceId}</span>
          <span class="priority-tag ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
          ${dueHtml}
        </div>
      </div>

      <div class="admin-task-actions">
        <button class="action-btn edit-task-btn" title="Edit Task">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete delete-task-btn" title="Delete Task">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // Toggle Checkbox Click
    const checkbox = card.querySelector('.admin-checkbox');
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      card.classList.toggle('is-done');
      await window.api.toggleTask(task._id);
    });

    // Edit button click
    const editBtn = card.querySelector('.edit-task-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(task);
    });

    // Delete button click
    const deleteBtn = card.querySelector('.delete-task-btn');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmDelete = confirm(`Are you sure you want to delete "${task.title}"?`);
      if (confirmDelete) {
        await window.api.deleteTask(task._id);
      }
    });

    taskStream.appendChild(card);
  });
}

function openEditModal(task) {
  taskEditId.value = task._id;
  taskModalTitle.textContent = 'Edit Task';

  const radio = document.querySelector(`input[name="assignedDevice"][value="${task.deviceId}"]`);
  if (radio) radio.checked = true;

  taskTitleInput.value = task.title || '';
  taskDescInput.value = task.description || '';
  taskPriorityInput.value = task.priority || 'medium';

  if (task.dueDate) {
    const d = new Date(task.dueDate);
    taskDueInput.value = d.toISOString().split('T')[0];
  } else {
    taskDueInput.value = '';
  }

  taskModal.style.display = 'flex';
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
