const { io } = require('socket.io-client');

const SERVER_URL = 'http://127.0.0.1:5555';

async function testSocketFlow() {
  console.log('--- Testing Socket.IO Real-Time Synchronization Flow ---');

  // 1. Get Admin Token
  const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@officetask.com', password: 'Admin@12345' })
  });
  const { token } = await loginRes.json();
  console.log('[+] Admin JWT retrieved');

  // 2. Connect Admin Socket (iPhone simulation)
  const adminSocket = io(SERVER_URL, {
    auth: { type: 'admin', token }
  });

  await new Promise((resolve) => {
    adminSocket.on('connect', () => {
      console.log('[+] Admin Socket (iPhone) connected successfully');
      resolve();
    });
  });

  // 3. Connect Device Socket (Desktop Widget simulation for OFFICE-PC-02)
  const deviceSocket = io(SERVER_URL, {
    auth: {
      type: 'device',
      deviceId: 'OFFICE-PC-02',
      deviceKey: 'key-office-pc-02'
    }
  });

  // Test: Device online status received by Admin
  await new Promise((resolve) => {
    adminSocket.on('device:status', (data) => {
      if (data.deviceId === 'OFFICE-PC-02' && data.status === 'online') {
        console.log('[PASS] Admin received device:status (OFFICE-PC-02 is ONLINE)');
        resolve();
      }
    });
  });

  // Test: Admin creates task, Device receives task:created immediately
  let createdTask = null;
  await new Promise(async (resolve) => {
    deviceSocket.on('task:created', (task) => {
      console.log(`[PASS] Laptop 2 (OFFICE-PC-02) received instant task:created: "${task.title}"`);
      createdTask = task;
      resolve();
    });

    // Create task from iPhone Admin
    await fetch(`${SERVER_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        deviceId: 'OFFICE-PC-02',
        title: 'Real-time Sync Test Task',
        description: 'Instant notification to Laptop 2',
        priority: 'high'
      })
    });
  });

  // Test: Laptop 2 completes task via socket, Admin receives task:toggled immediately
  await new Promise((resolve) => {
    adminSocket.on('task:toggled', (task) => {
      if (task._id === createdTask._id) {
        console.log(`[PASS] iPhone Admin received instant task:toggled event (Status: ${task.status})`);
        resolve();
      }
    });

    // Device emits toggle
    deviceSocket.emit('task:toggle', { taskId: createdTask._id });
  });

  // Cleanup created task
  await fetch(`${SERVER_URL}/api/tasks/${createdTask._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  adminSocket.disconnect();
  deviceSocket.disconnect();
  console.log('[+] All Socket.IO real-time tests passed successfully!\n');
  process.exit(0);
}

testSocketFlow().catch((err) => {
  console.error('Socket test error:', err);
  process.exit(1);
});
