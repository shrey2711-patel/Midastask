import { DurableObject } from "cloudflare:workers";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS
    }
  });
}

function getDefaultDevices(now) {
  return [
    {
      id: "OFFICE-PC-01",
      name: "Main HP Laptop",
      numBadge: "1",
      department: "Workstation 1",
      user: "Main HP Laptop",
      isPoweredOn: false,
      lastPingTime: now - 5 * 60 * 1000,
      stuckThresholdMinutes: 30,
      hostname: ""
    },
    {
      id: "OFFICE-PC-02",
      name: "Grey Laptop",
      numBadge: "2",
      department: "Workstation 2",
      user: "Grey Laptop",
      isPoweredOn: false,
      lastPingTime: now - 5 * 60 * 1000,
      stuckThresholdMinutes: 30,
      hostname: ""
    },
    {
      id: "OFFICE-PC-03",
      name: "Ghanshyam's Laptop",
      numBadge: "3",
      department: "Workstation 3",
      user: "Ghanshyam's Laptop",
      isPoweredOn: false,
      lastPingTime: now - 3 * 3600 * 1000,
      stuckThresholdMinutes: 30,
      hostname: ""
    }
  ];
}

function getDefaultTasks(now) {
  return [
    {
      id: "note-101",
      deviceId: "OFFICE-PC-01",
      title: "Quarterly Vendor Invoices Audit",
      category: "Finance",
      completed: false,
      priority: "urgent",
      timeframe: "This Month",
      startedAt: now - 6 * 60 * 1000,
      createdAt: new Date(now - 6 * 60 * 1000).toISOString()
    },
    {
      id: "note-102",
      deviceId: "OFFICE-PC-01",
      title: "Verify payroll ledger & export timesheets",
      category: "Operations",
      completed: true,
      priority: "high",
      timeframe: "This Month",
      startedAt: now - 86400000,
      createdAt: new Date(now - 86400000).toISOString()
    },
    {
      id: "note-103",
      deviceId: "OFFICE-PC-01",
      title: "Submit monthly utility reimbursement",
      category: "Accounting",
      completed: false,
      priority: "medium",
      timeframe: "This Month",
      startedAt: now - 15 * 60 * 1000,
      createdAt: new Date(now - 172800000).toISOString()
    },
    {
      id: "note-201",
      deviceId: "OFFICE-PC-02",
      title: "Deploy hotfix for authentication refresh token",
      category: "Engineering",
      completed: false,
      priority: "urgent",
      timeframe: "This Month",
      startedAt: now - 58 * 60 * 1000,
      createdAt: new Date(now - 58 * 60 * 1000).toISOString()
    },
    {
      id: "note-202",
      deviceId: "OFFICE-PC-02",
      title: "Optimize database compound indexes",
      category: "Database",
      completed: true,
      priority: "high",
      timeframe: "This Month",
      startedAt: now - 86400000,
      createdAt: new Date(now - 86400000).toISOString()
    },
    {
      id: "note-301",
      deviceId: "OFFICE-PC-03",
      title: "Resolve Priority Support Ticket #8841 (Acme Corp)",
      category: "Support",
      completed: false,
      priority: "urgent",
      timeframe: "This Month",
      startedAt: now,
      createdAt: new Date(now).toISOString()
    },
    {
      id: "note-302",
      deviceId: "OFFICE-PC-03",
      title: "Customer onboarding walkthrough call (Apex Logistics)",
      category: "Success",
      completed: false,
      priority: "high",
      timeframe: "This Month",
      startedAt: now - 43200000,
      createdAt: new Date(now - 43200000).toISOString()
    }
  ];
}

export class MidasState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.initSchema();
  }

  initSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        numBadge TEXT NOT NULL,
        department TEXT NOT NULL,
        user TEXT NOT NULL,
        isPoweredOn INTEGER NOT NULL DEFAULT 0,
        lastPingTime INTEGER NOT NULL,
        stuckThresholdMinutes INTEGER NOT NULL DEFAULT 30,
        hostname TEXT DEFAULT '',
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        deviceId TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        timeframe TEXT DEFAULT 'This Month',
        startedAt INTEGER NOT NULL,
        completedAt TEXT DEFAULT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    const countRow = [...this.sql.exec("SELECT COUNT(*) AS cnt FROM devices")][0];
    if (!countRow || countRow.cnt === 0) {
      const now = Date.now();
      for (const d of getDefaultDevices(now)) {
        this.sql.exec(
          `INSERT INTO devices (id, name, numBadge, department, user, isPoweredOn, lastPingTime, stuckThresholdMinutes, hostname, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          d.id, d.name, d.numBadge, d.department, d.user, d.isPoweredOn ? 1 : 0, d.lastPingTime, d.stuckThresholdMinutes, d.hostname, new Date(now).toISOString()
        );
      }
      for (const t of getDefaultTasks(now)) {
        this.sql.exec(
          `INSERT INTO tasks (id, deviceId, title, category, completed, priority, timeframe, startedAt, completedAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          t.id, t.deviceId, t.title, t.category, t.completed ? 1 : 0, t.priority, t.timeframe, t.startedAt, t.completed ? t.createdAt : null, t.createdAt
        );
      }
    }
  }

  getDevices() {
    const rows = [...this.sql.exec("SELECT * FROM devices ORDER BY numBadge ASC")];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      numBadge: r.numBadge,
      department: r.department,
      user: r.user,
      isPoweredOn: Boolean(r.isPoweredOn),
      lastPingTime: Number(r.lastPingTime),
      stuckThresholdMinutes: Number(r.stuckThresholdMinutes || 30),
      hostname: r.hostname || "",
      updatedAt: r.updatedAt
    }));
  }

  getTasks(deviceId) {
    const query = deviceId && deviceId !== "ALL"
      ? this.sql.exec("SELECT * FROM tasks WHERE deviceId = ? ORDER BY completed ASC, createdAt DESC", deviceId.toUpperCase())
      : this.sql.exec("SELECT * FROM tasks ORDER BY completed ASC, createdAt DESC");
    return [...query].map(r => ({
      id: r.id,
      deviceId: r.deviceId,
      title: r.title,
      category: r.category || "",
      completed: Boolean(r.completed),
      priority: r.priority || "medium",
      timeframe: r.timeframe || "This Month",
      startedAt: Number(r.startedAt),
      completedAt: r.completedAt || null,
      createdAt: r.createdAt
    }));
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET /api/state
    if (method === "GET" && path === "/api/state") {
      const deviceId = url.searchParams.get("deviceId") || "ALL";
      return jsonResponse({
        ok: true,
        serverTime: Date.now(),
        devices: this.getDevices(),
        tasks: this.getTasks(deviceId)
      });
    }

    // GET /api/tasks
    if (method === "GET" && path === "/api/tasks") {
      const deviceId = url.searchParams.get("deviceId") || "ALL";
      return jsonResponse({
        ok: true,
        serverTime: Date.now(),
        tasks: this.getTasks(deviceId)
      });
    }

    // POST /api/tasks
    if (method === "POST" && path === "/api/tasks") {
      const body = await request.json().catch(() => ({}));
      if (!body.title || !String(body.title).trim()) {
        return jsonResponse({ ok: false, error: "Title is required" }, 400);
      }
      const now = Date.now();
      const id = body.id || ("note-" + now + "-" + Math.floor(Math.random() * 1000));
      const deviceId = (body.deviceId || "OFFICE-PC-01").toUpperCase();
      const title = String(body.title).trim();
      const category = String(body.category || "").trim();
      const priority = body.priority || "medium";
      const timeframe = body.timeframe || "This Month";
      const completed = body.completed ? 1 : 0;
      const startedAt = Number(body.startedAt || now);
      const createdAt = body.createdAt || new Date(now).toISOString();

      this.sql.exec(
        `INSERT OR REPLACE INTO tasks (id, deviceId, title, category, completed, priority, timeframe, startedAt, completedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, deviceId, title, category, completed, priority, timeframe, startedAt, completed ? createdAt : null, createdAt
      );

      const task = this.getTasks("ALL").find(t => t.id === id);
      return jsonResponse({ ok: true, task }, 201);
    }

    // POST /api/tasks/:id/toggle
    const toggleMatch = path.match(/^\/api\/tasks\/([^/]+)\/toggle$/);
    if ((method === "POST" || method === "PATCH") && toggleMatch) {
      const id = decodeURIComponent(toggleMatch[1]);
      const rows = [...this.sql.exec("SELECT * FROM tasks WHERE id = ?", id)];
      if (rows.length === 0) {
        return jsonResponse({ ok: false, error: "Task not found" }, 404);
      }
      const existing = rows[0];
      const nextCompleted = existing.completed ? 0 : 1;
      const now = Date.now();
      const completedAt = nextCompleted ? new Date(now).toISOString() : null;
      const startedAt = nextCompleted ? existing.startedAt : now;

      this.sql.exec(
        "UPDATE tasks SET completed = ?, completedAt = ?, startedAt = ? WHERE id = ?",
        nextCompleted, completedAt, startedAt, id
      );
      const updated = this.getTasks("ALL").find(t => t.id === id);
      return jsonResponse({ ok: true, task: updated });
    }

    // PATCH /api/tasks/:id
    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if ((method === "PATCH" || method === "PUT") && taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);
      const rows = [...this.sql.exec("SELECT * FROM tasks WHERE id = ?", id)];
      if (rows.length === 0) {
        return jsonResponse({ ok: false, error: "Task not found" }, 404);
      }
      const existing = rows[0];
      const body = await request.json().catch(() => ({}));

      const deviceId = body.deviceId ? String(body.deviceId).toUpperCase() : existing.deviceId;
      const title = body.title !== undefined ? String(body.title).trim() : existing.title;
      const category = body.category !== undefined ? String(body.category).trim() : existing.category;
      const priority = body.priority !== undefined ? body.priority : existing.priority;
      const timeframe = body.timeframe !== undefined ? body.timeframe : existing.timeframe;
      const completed = body.completed !== undefined ? (body.completed ? 1 : 0) : existing.completed;
      const startedAt = body.startedAt !== undefined ? Number(body.startedAt) : existing.startedAt;
      const completedAt = completed ? (existing.completedAt || new Date().toISOString()) : null;

      this.sql.exec(
        `UPDATE tasks SET deviceId = ?, title = ?, category = ?, priority = ?, timeframe = ?, completed = ?, startedAt = ?, completedAt = ? WHERE id = ?`,
        deviceId, title, category, priority, timeframe, completed, startedAt, completedAt, id
      );
      const updated = this.getTasks("ALL").find(t => t.id === id);
      return jsonResponse({ ok: true, task: updated });
    }

    // DELETE /api/tasks/:id
    if (method === "DELETE" && taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);
      this.sql.exec("DELETE FROM tasks WHERE id = ?", id);
      return jsonResponse({ ok: true, id });
    }

    // POST /api/heartbeat
    if (method === "POST" && path === "/api/heartbeat") {
      const body = await request.json().catch(() => ({}));
      const deviceId = (body.deviceId || "").toUpperCase();
      if (!deviceId) {
        return jsonResponse({ ok: false, error: "deviceId is required" }, 400);
      }

      const now = Date.now();
      const isPoweredOn = body.isPoweredOn !== false ? 1 : 0;
      const hostname = body.hostname ? String(body.hostname).slice(0, 64) : "";
      const lastPingTime = isPoweredOn ? now : now - 5 * 60 * 1000;

      const existing = [...this.sql.exec("SELECT * FROM devices WHERE id = ?", deviceId)];
      if (existing.length > 0) {
        this.sql.exec(
          `UPDATE devices SET isPoweredOn = ?, lastPingTime = ?, hostname = CASE WHEN ? != '' THEN ? ELSE hostname END, updatedAt = ? WHERE id = ?`,
          isPoweredOn, lastPingTime, hostname, hostname, new Date(now).toISOString(), deviceId
        );
      }
      const dev = this.getDevices().find(d => d.id === deviceId);
      return jsonResponse({ ok: true, serverTime: now, device: dev || null });
    }

    // POST /api/sync-batch (Widget reconnect offline queue)
    if (method === "POST" && path === "/api/sync-batch") {
      const body = await request.json().catch(() => ({}));
      const actions = Array.isArray(body.actions) ? body.actions : [];
      for (const act of actions) {
        if (act && act.id && typeof act.completed === "boolean") {
          const completedInt = act.completed ? 1 : 0;
          const completedAt = act.completed ? new Date().toISOString() : null;
          this.sql.exec("UPDATE tasks SET completed = ?, completedAt = ? WHERE id = ?", completedInt, completedAt, act.id);
        }
      }
      return jsonResponse({
        ok: true,
        serverTime: Date.now(),
        devices: this.getDevices(),
        tasks: this.getTasks(body.deviceId || "ALL")
      });
    }

    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonResponse({
        ok: true,
        service: "midastask-cloud",
        storage: "cloudflare-durable-object-sqlite",
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname.startsWith("/api/")) {
      const id = env.MIDAS_STATE.idFromName("global-midastask-v1");
      const stub = env.MIDAS_STATE.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
