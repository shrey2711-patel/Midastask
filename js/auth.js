/**
 * OfficeTask / Midas Task Management
 * Authentication Module (Prototype Mock Auth)
 */

const Auth = {
  SESSION_KEY: 'midastask_auth_session',

  // Initialize Auth state on page load
  init() {
    this.setupLoginForm();
    this.setupPasswordToggle();
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem(this.SESSION_KEY);
  },

  // Get current user session
  getCurrentUser() {
    const session = localStorage.getItem(this.SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch (e) {
      return null;
    }
  },

  // Mock login handler
  async login(email, password) {
    // Basic client validation
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    // Simulate network delay for realistic SaaS prototype feel
    await new Promise(resolve => setTimeout(resolve, 600));

    const userSession = {
      email: email.trim().toLowerCase(),
      name: email.split('@')[0],
      role: 'Administrator',
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(userSession));
    return userSession;
  },

  // Mock logout handler
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'login.html';
  },

  // Wire up Login Form
  setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('submitBtn');
    const errorAlert = document.getElementById('errorAlert');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value;
      const password = passwordInput.value;

      // Reset error alert
      if (errorAlert) {
        errorAlert.classList.add('hidden');
        errorAlert.textContent = '';
      }

      // Set loading state
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>Signing in...</span>
      `;

      try {
        await this.login(email, password);
        // Successful login: navigate to dashboard
        window.location.href = 'dashboard.html';
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        if (errorAlert) {
          errorAlert.textContent = err.message || 'Login failed. Please check your credentials.';
          errorAlert.classList.remove('hidden');
        } else {
          alert(err.message);
        }
      }
    });
  },

  // Wire up password visibility toggle
  setupPasswordToggle() {
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('passwordInput');
    if (!toggleBtn || !passwordInput) return;

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      // Update icon
      toggleBtn.innerHTML = isPassword
        ? `<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>`
        : `<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
    });
  }
};

window.Auth = Auth;
