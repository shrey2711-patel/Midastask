# OfficeTask / Midas Task Management – UI/UX Prototype

High-fidelity, responsive frontend prototype recreated directly from the **Laptop UI/UX Design PDF** and **Mobile UI/UX Design PDF**.

---

## 🎨 1. PDF Design System Analysis

| Design Element | Specification in PDF | Implementation |
| :--- | :--- | :--- |
| **Primary Brand** | `MIDAS TASK MANAGEMENT` | Bold grotesque sans-serif (`font-black tracking-tight uppercase`) |
| **Card Heading** | `notes list` | Bold lowercase title (`font-black text-3xl`) |
| **Sub-label** | `with checkbox` | Clean sans-serif subtitle under card header |
| **Active Indicator**| Solid Black Circle | `bg-black w-10 h-10 rounded-full` indicator per workstation |
| **History Toggle** | Blue pill with white toggle knob & text `history` | Custom CSS `.history-toggle-pill` with `#2A7BE4` blue fill |
| **Filter Dropdown**| `This Month` with chevron `v` | Rounded pill dropdown supporting Today, Week, Month, All Time |
| **Input Fields** | Neutral light gray fill (`#EAEAEA` / `#ECECEC`) | Borderless rounded-lg inputs with subtle focus rings |
| **Button Style** | Dark charcoal pill (`#474747`) with white text `sign up` | Rounded-xl button matching the PDF login form |

---

## 💻 2. Two Synchronized Interface Formats

### A. Laptop / Desktop Version (`LAPTOP UI.pdf`)
- **Page 01 (Login)**: Centered `MIDAS TASK MANAGEMENT` header, minimal `Login` card with uppercase `EMAIL` and `PASSWORD` labels, and charcoal `sign up` submit button.
- **Page 02 (Dashboard)**: Two-line stacked logo on left, `This Month` and `history` toggle on right. Three wide cards in a 3-column layout representing the 3 office workstations:
  - **OFFICE-PC-01** (Finance & Ops)
  - **OFFICE-PC-02** (Dev & Engineering)
  - **OFFICE-PC-03** (Customer Support)

### B. Mobile Version (`MOBILE UI.pdf`)
- **Page 01 (Login)**: Stacked touch-friendly mobile login container.
- **Page 02 (Dashboard)**: Centered header, controls row, and 3 vertically stacked cards with thumb-friendly touch targets.

---

## ⚡ 3. Prototype Interactivity & Features

- **Authentication Flow**:
  - Validates email and password length.
  - Password visibility toggle (eye icon).
  - Simulates a loading state before navigating to the main dashboard.
  - Pre-filled with PDF default `hello@reallygreatsite.com`.
  - Sign-out button clears session and returns to login.
- **Task & Notes List**:
  - Interactive custom checkboxes with smooth strikethrough animation.
  - Live completion counters on each card (e.g. `2/3 done`).
  - "+ Add to list" modal allowing remote note creation for any laptop with priority and categories.
  - Inline edit and delete buttons on hover/touch.
- **Filter & History Toggle**:
  - Selecting "This Month", "Today", or "This Week" updates the active task stream.
  - Clicking the blue **`history`** toggle switches between active pending tasks and completed archive items.
- **Data Persistence**:
  - Uses `localStorage` via [`data/mock-data.js`](data/mock-data.js) so any created or checked tasks persist across browser reloads.

---

## 🚀 4. How to Run the Prototype Locally

### Option 1: Python HTTP Server (Recommended)
Run the included python development server:
```bash
python serve.py
```
Or with standard python module:
```bash
python -m http.server 8000
```
Open **`http://localhost:8000/login.html`** in your browser.

### Option 2: Direct Browser Open
Simply double-click `login.html` or `index.html` to open directly in Google Chrome, Microsoft Edge, or Safari.

---

## 📁 5. Project File Structure

```
OfficeTask-UI/
├── index.html           # Initial router & entry point
├── login.html           # Page 01: Login Screen (Laptop & Mobile)
├── dashboard.html       # Page 02: Main Management Dashboard
├── serve.py             # Lightweight local development server
│
├── css/
│   └── style.css        # Custom styles, history toggle, checkboxes
│
├── js/
│   ├── auth.js          # Mock auth flow, validation, session
│   ├── dashboard.js     # Dropdown filter, history toggle, view switcher
│   ├── tasks.js         # Checkbox toggle, task CRUD, modal controller
│   └── app.js           # Page initialization and event coordination
│
├── data/
│   └── mock-data.js     # Default mock tasks & device data with localStorage
│
├── LAPTOP UI.pdf        # Reference 1: Laptop design specification
├── MOBILE UI.pdf        # Reference 2: Mobile design specification
└── README.md            # Design analysis and documentation
```
