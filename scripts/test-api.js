const http = require('http');

const SERVER_URL = 'http://127.0.0.1:5555';

async function request(path, options = {}) {
  const url = `${SERVER_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- Starting OfficeTask Integration Test Suite ---');
  let failures = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      failures++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/health');
    assert(health.ok && health.data.database === 'connected', '1. Server Health Check & DB Connected');

    // 2. Admin Login
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@officetask.com', password: 'Admin@12345' })
    });
    assert(login.ok && !!login.data.token, '2. Admin Login & JWT Issuance');
    const adminToken = login.data.token;

    // 3. Admin Password Verification (Desktop Widget Unlock IPC verification)
    const verifyPwd = await request('/api/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'Admin@12345' })
    });
    assert(verifyPwd.ok && verifyPwd.data.unlocked === true && !!verifyPwd.data.passwordHash, '3. Desktop Widget Admin Password Verification');

    // 4. Incorrect Password Rejection
    const badPwd = await request('/api/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'WrongPassword999' })
    });
    assert(badPwd.status === 401, '4. Reject Incorrect Admin Password');

    // 5. Get Devices with stats
    const devices = await request('/api/devices', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(devices.ok && devices.data.devices.length === 3, '5. Retrieve All 3 Independent Office Laptops');
    assert(devices.data.devices.every(d => d.stats && typeof d.stats.pending === 'number'), '6. Verify Device Task Stats Attached');

    // 6. Get Tasks for OFFICE-PC-01
    const tasks01 = await request('/api/tasks?deviceId=OFFICE-PC-01', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(tasks01.ok && tasks01.data.tasks.length > 0, '7. Retrieve Filtered Tasks for OFFICE-PC-01');

    // 7. Create Task for OFFICE-PC-02
    const newTask = await request('/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        deviceId: 'OFFICE-PC-02',
        title: 'Automated Test Task for Laptop 2',
        description: 'Testing iPhone admin to desktop widget sync',
        priority: 'urgent',
        dueDate: new Date().toISOString()
      })
    });
    assert(newTask.ok && newTask.data.task.title === 'Automated Test Task for Laptop 2', '8. Admin Create Remote Task for Specific Laptop');
    const createdTaskId = newTask.data.task._id;

    // 8. Toggle Task Completion
    const toggled = await request(`/api/tasks/${createdTaskId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(toggled.ok && toggled.data.task.status === 'completed', '9. Toggle Task Status (Pending -> Completed)');

    // 9. Batch Offline Sync (Simulation of widget reconnecting after offline changes)
    const syncRes = await request('/api/tasks/sync', {
      method: 'POST',
      headers: {
        'x-device-id': 'OFFICE-PC-02',
        'x-device-key': 'key-office-pc-02'
      },
      body: JSON.stringify({
        deviceId: 'OFFICE-PC-02',
        offlineChanges: [
          { taskId: createdTaskId, status: 'pending', completedAt: null }
        ]
      })
    });
    assert(syncRes.ok && syncRes.data.syncedCount === 1, '10. Desktop Widget Offline Batch Sync');

    // 10. Metrics API
    const metrics = await request('/api/tasks/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(metrics.ok && typeof metrics.data.metrics.totalPending === 'number', '11. Dashboard Metrics Calculation');

    // 11. Delete Task
    const deleted = await request(`/api/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleted.ok && deleted.data.success === true, '12. Admin Delete Task');

    console.log(`\nTest suite finished with ${failures} failure(s).`);
    process.exit(failures > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
