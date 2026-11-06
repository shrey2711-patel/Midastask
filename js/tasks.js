/**
 * OfficeTask / Midas Task Management
 * Tasks & Notes List Management
 */

const TaskManager = {
  activeTimeframe: 'This Month',
  historyMode: false,
  selectedDeviceId: 'ALL',
  activeLaptopTab: 'ALL',

  init() {
    this.loadState();
    this.renderAllCards();
    this.setupModalEvents();
    this.setupLiveSync();
    this.startAutoAnalyzer();
  },

  switchLaptopTab(tabId) {
    this.activeLaptopTab = tabId;
    const tabs = document.querySelectorAll('.laptop-tab-pill');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const cards = {
      'OFFICE-PC-01': document.getElementById('laptop-card-OFFICE-PC-01'),
      'OFFICE-PC-02': document.getElementById('laptop-card-OFFICE-PC-02'),
      'OFFICE-PC-03': document.getElementById('laptop-card-OFFICE-PC-03')
    };

    const grid = document.getElementById('workstationCardsGrid');

    if (tabId === 'ALL') {
      // Show all 3 cards in responsive grid
      Object.values(cards).forEach(card => card && card.classList.remove('tab-hidden'));
      if (grid) {
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 flex-1 items-start w-full max-w-md md:max-w-none mx-auto transition-all duration-300';
      }
    } else {
      // Focus single selected laptop card
      Object.entries(cards).forEach(([devId, card]) => {
        if (!card) return;
        if (devId === tabId) {
          card.classList.remove('tab-hidden');
        } else {
          card.classList.add('tab-hidden');
        }
      });
      if (grid) {
        grid.className = 'w-full max-w-xl mx-auto flex-1 items-start transition-all duration-300';
      }
    }
  },

  setupLiveSync() {
    if (window.DataStore && window.DataStore.syncChannel) {
      window.DataStore.syncChannel.onmessage = () => {
        this.renderAllCards();
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'midastask_notes_list') {
        this.renderAllCards();
      }
    });
  },

  loadState() {
    const savedFilter = localStorage.getItem('midastask_active_filter');
    if (savedFilter) this.activeTimeframe = savedFilter;

    const savedHistory = localStorage.getItem('midastask_history_mode');
    if (savedHistory !== null) this.historyMode = savedHistory === 'true';
  },

  saveState() {
    localStorage.setItem('midastask_active_filter', this.activeTimeframe);
    localStorage.setItem('midastask_history_mode', this.historyMode);
  },

  setTimeframe(filter) {
    this.activeTimeframe = filter;
    this.saveState();
    this.renderAllCards();
  },

  toggleHistoryMode() {
    this.historyMode = !this.historyMode;
    this.saveState();
    this.renderAllCards();
    return this.historyMode;
  },

  getFilteredNotesForDevice(deviceId) {
    const allNotes = window.DataStore.getNotes();
    return allNotes.filter(note => {
      // Must match device
      if (note.deviceId !== deviceId) return false;

      // History mode filter: shows all completed or archived items
      if (this.historyMode) {
        return note.completed === true || note.timeframe === 'History';
      }

      // Normal mode: Active checklist (filters by timeframe)
      if (this.activeTimeframe === 'Today') {
        const noteDate = new Date(note.createdAt);
        const today = new Date();
        const isToday = noteDate.toDateString() === today.toDateString();
        return isToday || note.priority === 'urgent';
      } else if (this.activeTimeframe === 'This Week') {
        const noteTime = new Date(note.createdAt).getTime();
        const weekAgo = Date.now() - (7 * 86400000);
        return noteTime >= weekAgo;
      } else if (this.activeTimeframe === 'This Month') {
        const noteDate = new Date(note.createdAt);
        const now = new Date();
        const isThisMonth = noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear();
        return isThisMonth || note.timeframe === 'This Month' || !note.completed;
      } else if (this.activeTimeframe === 'All Time') {
        return true;
      }
      return true;
    });
  },

  renderAllCards() {
    const devices = window.DataStore.getDevices();
    devices.forEach(device => {
      this.renderDeviceCardNotes(device.id);
      this.updateDeviceStatusUI(device);
    });

    // Update global counters & iOS/Android Red App Icon Badge
    this.updateGlobalSummary();
    this.updateAppBadge();
  },

  startAutoAnalyzer() {
    if (this._analyzerInterval) clearInterval(this._analyzerInterval);
    // Run immediately
    this.runAutoAnalysis();
    // Continuous time-based performance analysis loop (every 3 seconds)
    this._analyzerInterval = setInterval(() => {
      this.runAutoAnalysis();
    }, 3000);
  },

  runAutoAnalysis() {
    const devices = window.DataStore.getDevices();
    devices.forEach(device => {
      const analysis = window.DataStore.autoAnalyzeDevice(device.id);
      this.applyAnalysisToUI(device, analysis);
    });
  },

  updateDeviceStatusUI(device) {
    const analysis = window.DataStore.autoAnalyzeDevice(device.id);
    this.applyAnalysisToUI(device, analysis);
  },

  applyAnalysisToUI(device, analysis) {
    const badge = document.getElementById(`rgb-badge-${device.id}`);
    const cardLine = document.getElementById(`card-rgb-line-${device.id}`);
    const perfTag = document.getElementById(`perf-tag-${device.id}`);
    const footerStatus = document.getElementById(`footer-status-${device.id}`);
    const tabDot = document.getElementById(`tab-rgb-${device.id}`);

    const color = analysis.rgbColor; // 'green', 'yellow', 'red'

    // 1. Update glowing top RGB line on card
    if (cardLine) {
      cardLine.classList.remove('line-green', 'line-yellow', 'line-red');
      cardLine.classList.add(`line-${color}`);
    }

    // 2. Update 1, 2, 3 badge
    if (badge) {
      badge.classList.remove('rgb-green', 'rgb-yellow', 'rgb-red');
      badge.classList.add(`rgb-${color}`);
      badge.setAttribute('title', `${device.name || device.id} • ${analysis.tagText} (${analysis.tagDetail})`);
    }

    // 3. Update 3 laptop tab indicator
    if (tabDot) {
      tabDot.className = 'w-2.5 h-2.5 rounded-full shadow-xs';
      if (color === 'green') tabDot.classList.add('bg-emerald-500');
      else if (color === 'yellow') tabDot.classList.add('bg-amber-500');
      else tabDot.classList.add('bg-rose-500');
    }

    // 4. Update Performance Pill Tag under user name (Solid colors)
    if (perfTag) {
      if (color === 'green') {
        perfTag.className = 'mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 status-pill';
        perfTag.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Working Good (Active)</span>';
      } else if (color === 'yellow') {
        perfTag.className = 'mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 status-pill';
        perfTag.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>${analysis.tagText}</span>`;
      } else {
        perfTag.className = 'mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 status-pill';
        perfTag.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>${analysis.tagText}</span>`;
      }
    }

    // 5. Update Footer Status
    if (footerStatus) {
      if (color === 'green') {
        footerStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-emerald-600">Online & Good</span>';
      } else if (color === 'yellow') {
        footerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span class="text-amber-600">${analysis.footerText}</span>`;
      } else {
        footerStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span class="text-rose-600">PC Offline</span>';
      }
    }

    // 6. Highlight bottleneck task in the task list if stuck
    const cardNotes = document.querySelectorAll(`#notes-list-${device.id} [data-note-id]`);
    cardNotes.forEach(el => {
      const noteId = el.getAttribute('data-note-id');
      const badgeContainer = el.querySelector('.task-meta-row');
      const existingStuckPill = el.querySelector('.stuck-time-pill');

      if (analysis.isStuck && noteId === analysis.stuckTaskId) {
        el.classList.add('task-stuck-highlight');
        if (!existingStuckPill && badgeContainer) {
          const pill = document.createElement('span');
          pill.className = 'stuck-time-pill text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1';
          pill.innerHTML = `<span>&#x23F1; Stuck (${analysis.elapsedDuration})</span>`;
          badgeContainer.appendChild(pill);
        }
      } else {
        el.classList.remove('task-stuck-highlight');
        if (existingStuckPill) existingStuckPill.remove();
      }
    });
  },

  handleCycleDeviceStatus(deviceId) {
    // Disabled: Status is automated by PC connection and time logic only.
  },

  renderDeviceCardNotes(deviceId) {
    const container = document.getElementById(`notes-list-${deviceId}`);
    if (!container) return;

    // Trigger smooth refresh animation on container
    container.classList.remove('notes-container-animated');
    void container.offsetWidth; // Force reflow
    container.classList.add('notes-container-animated');

    const notes = this.getFilteredNotesForDevice(deviceId);
    const countBadge = document.getElementById(`notes-count-${deviceId}`);
    const subtitleEl = document.getElementById(`card-subtitle-${deviceId}`);

    if (subtitleEl) {
      if (this.historyMode) {
        subtitleEl.innerHTML = '<span class="inline-flex items-center gap-1.5 text-blue-600 font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>history archive</span>';
      } else {
        subtitleEl.textContent = 'with checkbox';
      }
    }

    if (countBadge) {
      const completedCount = notes.filter(n => n.completed).length;
      if (this.historyMode) {
        countBadge.textContent = `${completedCount} completed`;
      } else {
        countBadge.textContent = `${completedCount}/${notes.length}`;
      }
    }

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-gray-400">
          <svg class="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <p class="text-xs font-medium">No ${this.historyMode ? 'history' : 'active'} notes</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(note => `
      <div class="group flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 transition-all border border-gray-100/60" data-note-id="${note.id}">
        <input 
          type="checkbox" 
          class="custom-task-checkbox mt-0.5" 
          ${note.completed ? 'checked' : ''} 
          onchange="TaskManager.handleToggle('${note.id}')"
          title="${note.completed ? 'Mark pending' : 'Mark done'}"
        >
        <div class="flex-1 min-w-0 cursor-pointer" onclick="TaskManager.handleToggle('${note.id}')">
          <p class="text-xs font-semibold text-gray-900 leading-snug break-words ${note.completed ? 'task-completed-text' : ''}">
            ${escapeHtml(note.title)}
          </p>
          <div class="task-meta-row flex items-center gap-2 mt-1.5 flex-wrap">
            <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ${this.getPriorityBadgeClass(note.priority)}">
              ${note.priority || 'medium'}
            </span>
            ${note.category ? `<span class="text-[10px] text-gray-400">#${escapeHtml(note.category)}</span>` : ''}
          </div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button onclick="TaskManager.openEditModal('${note.id}')" class="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-white" title="Edit">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button onclick="TaskManager.handleDelete('${note.id}')" class="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-white" title="Delete">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  },

  getPriorityBadgeClass(priority) {
    switch (priority) {
      case 'urgent': return 'bg-red-50 text-red-600 border border-red-200/50';
      case 'high': return 'bg-amber-50 text-amber-700 border border-amber-200/50';
      case 'low': return 'bg-gray-100 text-gray-600';
      default: return 'bg-blue-50 text-blue-700 border border-blue-200/50';
    }
  },

  handleToggle(noteId) {
    window.DataStore.toggleNoteCompletion(noteId);
    this.renderAllCards();
  },

  handleDelete(noteId) {
    if (confirm('Delete this task?')) {
      window.DataStore.deleteNote(noteId);
      this.renderAllCards();
    }
  },

  openCreateModal(targetDeviceId = 'OFFICE-PC-01') {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskModalForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('taskModalTitle').textContent = 'Add Note to Task List';
    document.getElementById('modalNoteId').value = '';
    
    // Set device radio/select
    const deviceSelect = document.getElementById('modalDeviceSelect');
    if (deviceSelect) deviceSelect.value = targetDeviceId;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('modalNoteTitle').focus();
  },

  openEditModal(noteId) {
    const notes = window.DataStore.getNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const modal = document.getElementById('taskModal');
    if (!modal) return;

    document.getElementById('taskModalTitle').textContent = 'Edit Note';
    document.getElementById('modalNoteId').value = note.id;
    document.getElementById('modalDeviceSelect').value = note.deviceId;
    document.getElementById('modalNoteTitle').value = note.title;
    document.getElementById('modalNoteCategory').value = note.category || '';
    document.getElementById('modalNotePriority').value = note.priority || 'medium';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  setupModalEvents() {
    const form = document.getElementById('taskModalForm');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const modal = document.getElementById('taskModal');

    if (closeBtn) closeBtn.onclick = () => this.closeModal();
    if (cancelBtn) cancelBtn.onclick = () => this.closeModal();

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('modalNoteId').value;
        const deviceId = document.getElementById('modalDeviceSelect').value;
        const title = document.getElementById('modalNoteTitle').value.trim();
        const category = document.getElementById('modalNoteCategory').value.trim();
        const priority = document.getElementById('modalNotePriority').value;

        if (!title) return;

        if (id) {
          window.DataStore.updateNote(id, { deviceId, title, category, priority });
        } else {
          window.DataStore.addNote({ deviceId, title, category, priority });
        }

        this.closeModal();
        this.renderAllCards();
      });
    }
  },

  updateGlobalSummary() {
    const notes = window.DataStore.getNotes();
    const totalEl = document.getElementById('globalTotalNotes');
    const completedEl = document.getElementById('globalCompletedNotes');
    if (totalEl) totalEl.textContent = notes.length;
    if (completedEl) completedEl.textContent = notes.filter(n => n.completed).length;
  },

  updateAppBadge() {
    const notes = window.DataStore.getNotes();
    const pendingCount = notes.filter(n => !n.completed).length;

    // 1. Native iOS / Android Web App Badging API (Permanent red number badge on phone app icon!)
    if ('setAppBadge' in navigator) {
      if (pendingCount > 0) {
        navigator.setAppBadge(pendingCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }

    // 2. Service Worker messaging for background badging
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BADGE',
        count: pendingCount
      });
    }

    // 3. Update Browser Tab Title
    if (pendingCount > 0) {
      document.title = `(${pendingCount}) MIDAS TASK MANAGEMENT`;
    } else {
      document.title = `MIDAS TASK MANAGEMENT`;
    }

    // 4. Update on-screen red badge pill
    const redBadgeEl = document.getElementById('redPendingBadge');
    if (redBadgeEl) {
      if (pendingCount > 0) {
        redBadgeEl.textContent = `${pendingCount} pending`;
        redBadgeEl.classList.remove('hidden');
      } else {
        redBadgeEl.classList.add('hidden');
      }
    }
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

window.TaskManager = TaskManager;
