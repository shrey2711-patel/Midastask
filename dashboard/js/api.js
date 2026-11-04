// API Client for OfficeTask Administrator Dashboard
const API_BASE = window.location.origin;

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('officetask_admin_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('officetask_admin_token', token);
    } else {
      localStorage.removeItem('officetask_admin_token');
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (res.status === 401) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new Error('Session expired. Please log in again.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  logout() {
    this.setToken(null);
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async getMetrics() {
    return this.request('/api/tasks/metrics');
  }

  async getDevices() {
    return this.request('/api/devices');
  }

  async getTasks(params = {}) {
    const query = new URLSearchParams();
    if (params.deviceId) query.append('deviceId', params.deviceId);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/tasks${qs}`);
  }

  async createTask(taskData) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async updateTask(id, taskData) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(taskData)
    });
  }

  async toggleTask(id) {
    return this.request(`/api/tasks/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  async deleteTask(id) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }
}

window.api = new ApiClient();
