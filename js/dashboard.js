/**
 * OfficeTask / Midas Task Management
 * Dashboard UI Controller
 */

const Dashboard = {
  currentViewMode: 'responsive', // 'responsive', 'desktop', 'mobile'

  init() {
    this.checkAuthentication();
    this.setupDropdown();
    this.setupHistoryToggle();
    this.setupDevicePreviewSwitcher();
    this.renderHeaderUserInfo();
    window.TaskManager.init();
  },

  checkAuthentication() {
    if (!window.Auth.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },

  renderHeaderUserInfo() {
    const user = window.Auth.getCurrentUser();
    const userEmailEl = document.getElementById('headerUserEmail');
    if (userEmailEl && user) {
      userEmailEl.textContent = user.email;
    }
  },

  setupDropdown() {
    const trigger = document.getElementById('timeframeDropdownTrigger');
    const menu = document.getElementById('timeframeDropdownMenu');
    const label = document.getElementById('timeframeCurrentLabel');
    const chevron = document.getElementById('timeframeChevron');
    if (!trigger || !menu) return;

    // Set initial label & active item from TaskManager
    const activeTimeframe = window.TaskManager.activeTimeframe || 'This Month';
    if (label) label.textContent = activeTimeframe;
    this.updateDropdownActiveState(activeTimeframe);

    const openMenu = () => {
      menu.classList.add('show');
      if (chevron) chevron.classList.add('rotate-180');
      trigger.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
      menu.classList.remove('show');
      if (chevron) chevron.classList.remove('rotate-180');
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('show');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('show')) {
        closeMenu();
      }
    });

    const items = menu.querySelectorAll('.dropdown-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = item.dataset.value;
        if (label) label.textContent = value;
        this.updateDropdownActiveState(value);
        closeMenu();
        window.TaskManager.setTimeframe(value);
      });
    });
  },

  updateDropdownActiveState(currentValue) {
    const menu = document.getElementById('timeframeDropdownMenu');
    if (!menu) return;
    const items = menu.querySelectorAll('.dropdown-item');
    items.forEach(item => {
      const val = item.dataset.value;
      const check = item.querySelector('.dropdown-check');
      if (val === currentValue) {
        item.classList.add('active');
        if (check) check.classList.remove('hidden');
      } else {
        item.classList.remove('active');
        if (check) check.classList.add('hidden');
      }
    });
  },

  setupHistoryToggle() {
    const toggle = document.getElementById('historyToggle');
    if (!toggle) return;

    // Initialize toggle visual state according to TaskManager
    this.updateHistoryToggleVisual(window.TaskManager.historyMode);

    toggle.addEventListener('click', () => {
      const isHistory = window.TaskManager.toggleHistoryMode();
      this.updateHistoryToggleVisual(isHistory);
    });
  },

  updateHistoryToggleVisual(isHistory) {
    const toggle = document.getElementById('historyToggle');
    if (!toggle) return;

    if (isHistory) {
      toggle.classList.remove('inactive');
      toggle.classList.add('active');
      toggle.setAttribute('aria-pressed', 'true');
      toggle.setAttribute('title', 'History Mode ON: Showing completed & archived tasks (Click for active list)');
    } else {
      toggle.classList.remove('active');
      toggle.classList.add('inactive');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('title', 'History Mode OFF: Showing active checklist (Click for history archive)');
    }
  },

  setupDevicePreviewSwitcher() {
    const btnDesktop = document.getElementById('previewDesktopBtn');
    const btnMobile = document.getElementById('previewMobileBtn');
    const btnFluid = document.getElementById('previewFluidBtn');
    const frameContainer = document.getElementById('mainContentContainer');

    if (!frameContainer) return;

    const setMode = (mode) => {
      this.currentViewMode = mode;
      [btnDesktop, btnMobile, btnFluid].forEach(b => b && b.classList.remove('bg-black', 'text-white'));
      
      if (mode === 'desktop') {
        if (btnDesktop) btnDesktop.classList.add('bg-black', 'text-white');
        frameContainer.className = 'w-full max-w-7xl mx-auto px-6 py-8 transition-all duration-300';
      } else if (mode === 'mobile') {
        if (btnMobile) btnMobile.classList.add('bg-black', 'text-white');
        frameContainer.className = 'device-preview-shell p-6 my-4 transition-all duration-300';
      } else {
        if (btnFluid) btnFluid.classList.add('bg-black', 'text-white');
        frameContainer.className = 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300';
      }
    };

    if (btnDesktop) btnDesktop.onclick = () => setMode('desktop');
    if (btnMobile) btnMobile.onclick = () => setMode('mobile');
    if (btnFluid) btnFluid.onclick = () => setMode('fluid');
  }
};

window.Dashboard = Dashboard;
