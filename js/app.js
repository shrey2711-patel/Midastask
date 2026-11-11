/**
 * OfficeTask / Midas Task Management
 * Main Application Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.endsWith('login.html') || path.endsWith('/login') || !!document.getElementById('loginForm');
  const isDashboardPage = path.endsWith('dashboard.html') || path.endsWith('/dashboard') || !!document.getElementById('workstationCardsGrid');

  if (isLoginPage) {
    if (window.Auth && window.Auth.isAuthenticated() && !window.location.search.includes('force=login')) {
      // Already authenticated, redirect to dashboard
      window.location.href = 'dashboard.html';
      return;
    }
    if (window.Auth) window.Auth.init();
  }

  if (isDashboardPage) {
    if (window.Dashboard) window.Dashboard.init();
  }
});
