# OfficeTask – Smart Office Desktop Task Management System

**OfficeTask** is a centralized, high-performance office task management system built specifically for Windows 10 & 11 workstations and mobile administration.

It features:
- **3 Independent Windows Desktop Floating Widgets** (`OFFICE-PC-01`, `OFFICE-PC-02`, `OFFICE-PC-03`) with a modern dark glassmorphism design, locked positioning, and strict administrator password protection.
- **1 Central Administrator Dashboard** designed as a responsive, touch-optimized Progressive Web App (PWA) accessible from iPhone Safari and installable to the iOS Home Screen.
- **Real-Time Bidirectional Synchronization** powered by Socket.IO and MongoDB Atlas (Mongoose).
- **Offline Functionality** with local task caching and an offline change queue that automatically syncs when internet connectivity returns.
- **Production Windows `.exe` Installer** powered by Electron Builder with NSIS.

---

## 🛠 Technology Stack

- **Desktop Widget**: Electron.js (frameless, transparent, always-on-top, context-isolated IPC).
- **Mobile Admin Dashboard**: Progressive Web App (PWA) — HTML5, CSS3, Vanilla JavaScript, Service Worker.
- **Backend & WebSockets**: Node.js, Express.js, Socket.IO.
- **Database**: MongoDB Atlas via Mongoose (Free M0 tier compatible).
- **Security**: bcrypt.js (password hashing), JWT (Admin tokens), protected Electron IPC.
- **Packaging & Deployment**: Electron Builder (Windows x64 installer), Render (`render.yaml`), Netlify (`netlify.toml`).

---

## 📁 Project Architecture

```
OfficeTask/
├── server/                        # Node.js + Express + Socket.IO Backend
│   ├── models/
│   │   ├── User.js                # Administrator schema with bcrypt hashing
│   │   ├── Device.js              # 3 Independent devices schema
│   │   └── Task.js                # Task model with priority, status, dueDate
│   ├── routes/
│   │   ├── auth.js                # Login, JWT verification, widget unlock auth
│   │   ├── devices.js             # Device registration & live metrics
│   │   └── tasks.js               # Task CRUD, filters, and offline batch sync
│   ├── middleware/
│   │   └── auth.js                # JWT & device key verification
│   ├── socket/
│   │   └── socketHandler.js       # Real-time rooms (device:ID & admin)
│   ├── seeds/
│   │   └── seed.js                # Database seeder (Admin & 3 laptops)
│   ├── .env.example               # Environment variables template
│   └── server.js                  # Express & Socket.IO HTTP server
│
├── dashboard/                     # iPhone Administrator Dashboard (PWA)
│   ├── index.html                 # Mobile-first glassmorphism interface
│   ├── manifest.webmanifest       # PWA manifest for iOS Home Screen
│   ├── sw.js                      # Service Worker caching & offline app shell
│   ├── css/
│   │   └── style.css              # iOS safe-area styling & dark glass theme
│   ├── js/
│   │   ├── app.js                 # PWA logic, state management & UI rendering
│   │   ├── api.js                 # Authenticated REST API client
│   │   └── socket.js              # Real-time WebSocket event bridge
│   └── icons/                     # PWA & iOS touch icons (192, 512, apple-touch)
│
├── desktop-widget/                # Windows Floating Desktop Widget (Electron)
│   ├── src/
│   │   ├── main.js                # Electron main process (security & IPC)
│   │   ├── preload.js             # Context-isolated secure bridge
│   │   ├── store.js               # Local storage & offline sync queue
│   │   └── ui/
│   │       ├── index.html         # Compact floating widget UI
│   │       ├── style.css          # Dark glassmorphism widget styles
│   │       └── renderer.js        # Widget interactivity & admin unlock modal
│   ├── assets/                    # Application icons (.ico, .png)
│   ├── electron-builder.json      # Windows NSIS installer configuration
│   └── package.json
│
├── scripts/
│   ├── test-api.js                # Automated REST API integration test suite
│   ├── test-socket.js             # Real-time Socket.IO sync test suite
│   └── generate-icons.js          # Pure Node.js asset generator
│
├── render.yaml                    # 1-Click Render Deployment config
├── netlify.toml                   # Netlify PWA hosting config
├── .env.example                   # Root environment configuration
└── package.json                   # Monorepo root scripts
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or higher (v24 LTS recommended)
- **MongoDB** (Local instance or free MongoDB Atlas cluster)

### 2. Configure Environment Variables
Copy `.env.example` in `server/` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Edit `server/.env` if you are using MongoDB Atlas:
```env
PORT=5555
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/officetask?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
ADMIN_EMAIL=admin@officetask.com
ADMIN_PASSWORD=Admin@12345
```

### 3. Seed Database & Start Server
Seed the initial administrator and 3 office devices:
```bash
npm run seed
```
Start the backend server:
```bash
npm run server
```
The server will start at:
- **API & PWA Dashboard**: `http://localhost:5555`
- **Network iPhone Access**: `http://<YOUR_LAPTOP_IP>:5555` (e.g. `http://192.168.1.10:5555`)

---

## 🔒 Administrator Password Protection

The Windows widget enforces strict lockdown after installation:

| Feature | Locked State (Default) | Unlocked Mode (Admin Authenticated) |
| :--- | :--- | :--- |
| **Widget Position** | Locked permanently | Draggable via top drag handle |
| **Widget Resizing** | Disabled | Disabled (fixed compact dimensions) |
| **Closing Widget** | Hidden & blocked via IPC | Close button (`X`) active |
| **Settings Access** | Hidden | Switch assigned laptop ID & server URL |
| **Auto Re-Lock** | Active | Automatically re-locks after 5 min of inactivity |

### How to Unlock:
1. Click the **"Locked"** badge on the top right of the desktop widget.
2. Enter the administrator password (default: `Admin@12345`).
3. The widget validates online against the server API (or offline against the locally stored bcrypt hash).
4. Once verified, the widget enters **Unlocked Mode**, revealing the drag handle, settings gear, and close button.

---

## 📱 iPhone Administrator Dashboard (PWA)

### Accessing on iPhone Safari:
1. Ensure your iPhone is connected to the same Wi-Fi network as the server (or deploy to Render/Netlify).
2. Open Safari and navigate to: `http://<LAPTOP_LOCAL_IP>:5555`
3. Tap the Safari **Share** button (`⎋` with arrow).
4. Tap **"Add to Home Screen"**.
5. The OfficeTask icon will appear on your iPhone screen with full-screen standalone app support!

### Dashboard Features:
- **Live Device Status Cards**: View online/offline status for `OFFICE-PC-01`, `OFFICE-PC-02`, and `OFFICE-PC-03`.
- **Metrics Bar**: Instant counts for Pending, Completed, and Overdue tasks.
- **Filtering by Laptop**: Tap any laptop card to filter the task feed exclusively to that device.
- **Real-Time Push**: Creating, editing, toggling, or deleting a task instantly notifies the respective laptop widget via WebSockets without page refreshes.

---

## 💻 3 Independent Devices Configuration

The system registers 3 independent workstations:

1. **OFFICE-PC-01** — Laptop 1 (Finance & Operations)
2. **OFFICE-PC-02** — Laptop 2 (Development & Tech)
3. **OFFICE-PC-03** — Laptop 3 (Customer Support & Sales)

Each workstation widget only queries, displays, and synchronizes its own assigned tasks.

To configure which device a laptop runs as:
1. Unlock the widget with the administrator password.
2. Click the **Settings** icon.
3. Select `OFFICE-PC-01`, `OFFICE-PC-02`, or `OFFICE-PC-03`.
4. Click **Save Changes**. The widget will immediately reconnect to that device's room.

---

## ⚡ Real-Time Synchronization & Offline Support

### Real-Time:
- Built with **Socket.IO rooms** (`device:OFFICE-PC-01`, `device:OFFICE-PC-02`, `device:OFFICE-PC-03`, and `admin`).
- Tasks assigned to Laptop 2 appear instantly on Laptop 2's screen.
- When Laptop 2 checks off a task, the iPhone dashboard updates immediately.

### Offline Mode:
- If the internet disconnects, the Windows widget switches to **Offline (cached mode)**.
- Tasks can still be checked off or reviewed.
- Changes are safely stored in the local offline queue (`officetask-store.json`).
- As soon as the network reconnects, the widget transmits batch changes to `/api/tasks/sync` and refreshes seamlessly with no duplicate entries.

---

## 📦 Building the Windows Installer (`.exe`)

To compile the standalone Windows installer:
```bash
npm run widget:build
```
This produces an NSIS installer executable in `desktop-widget/dist/`:
- `OfficeTask Setup 1.0.0.exe`

Installer features:
- Automatically creates Desktop and Start Menu shortcuts.
- Configurable installation path.
- Clean uninstallation support.

---

## ☁️ Cloud Deployment Guide (Free Tier)

### 1. MongoDB Atlas M0 (Free Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g. `officetask_admin`).
4. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere).
5. Click **Connect** -> **Drivers** -> Copy the connection string.
6. Set `MONGODB_URI` in your Render backend settings.

### 2. Render.com (Backend Hosting)
1. Create a free account on [Render.com](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository containing this project.
4. Render will detect `render.yaml` automatically and configure the Node web service.
5. In the Render Dashboard under **Environment**, paste your `MONGODB_URI`.
6. Your backend will deploy at `https://officetask-backend.onrender.com`.

### 3. Netlify (Optional Standalone PWA Hosting)
1. Create a free account on [Netlify](https://www.netlify.com).
2. Connect your repository.
3. Set publish directory to `dashboard/`.
4. Set build command to empty (static files).
5. Configure `netlify.toml` which is already included in this repository.
