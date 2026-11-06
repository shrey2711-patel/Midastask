/**
 * OfficeTask / Midas Task Management
 * Main Application Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check which page we are on
  const isLoginPage = window.location.pathname.endsWith('login.html') || document.getElementById('loginForm');
  const isDashboardPage = window.location.pathname.endsWith('dashboard.html') || document.getElementById('dashboardContent');

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
