// Socket.IO Client for iPhone Administrator Real-Time Synchronization
class AdminSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket && this.socket.connected) return;

    const token = window.api ? window.api.token : null;
    if (!token) return;

    if (typeof io === 'undefined') {
      console.warn('Socket.IO library not loaded yet');
      return;
    }

    this.socket = io(window.location.origin, {
      auth: {
        type: 'admin',
        token
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[Socket] Admin real-time link connected');
      window.dispatchEvent(new CustomEvent('socket:connection-changed', { detail: { online: true } }));
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[Socket] Admin real-time link disconnected');
      window.dispatchEvent(new CustomEvent('socket:connection-changed', { detail: { online: false } }));
    });

    this.socket.on('device:status', (data) => {
      window.dispatchEvent(new CustomEvent('socket:device-status', { detail: data }));
    });

    this.socket.on('task:created', (data) => {
      window.dispatchEvent(new CustomEvent('socket:task-created', { detail: data }));
    });

    this.socket.on('task:updated', (data) => {
      window.dispatchEvent(new CustomEvent('socket:task-updated', { detail: data }));
    });

    this.socket.on('task:toggled', (data) => {
      window.dispatchEvent(new CustomEvent('socket:task-toggled', { detail: data }));
    });

    this.socket.on('task:deleted', (data) => {
      window.dispatchEvent(new CustomEvent('socket:task-deleted', { detail: data }));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

window.socketManager = new AdminSocketManager();
