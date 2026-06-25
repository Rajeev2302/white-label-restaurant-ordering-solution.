# A White-Label Restaurant Ordering Solution.

A production-ready QR-based restaurant ordering system with real-time status tracking for customer ordering and kitchen staff dashboard.

## Project Structure
This project uses npm workspaces to manage three packages in a monorepo:
- `backend/`: Node.js Express server connected to SQLite database.
- `frontend/`: Customer-facing React app (Vite), running on port `5173`.
- `staff-dashboard/`: Staff/Kitchen monitoring React app (Vite), running on port `5174`.

## Prerequisites
- Node.js (version 18 or above recommended)
- npm (version 9 or above recommended)

## Installation & Setup

1. **Clone/Open the project directory:**
   Navigate into the project workspace root:
   ```bash
   cd C:\Users\RAJEEV KUMAR\.gemini\antigravity\scratch\lakshmi-ganesh-restaurant
   ```

2. **Install all dependencies:**
   Install dependencies for the root and all workspaces concurrently:
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment variables file in the backend package:
   ```bash
   cp backend/.env.example backend/.env
   ```

## Running the Application Locally

You can run the packages individually or start all of them concurrently:

### Method A: Run Everything Concurrently (Recommended)
From the root workspace folder, run:
```bash
npm run dev
```
This command starts all three workspaces concurrently:
- Backend Server: `http://localhost:5000`
- Customer Frontend: `http://localhost:5173`
- Staff Dashboard: `http://localhost:5174`

---

### Method B: Run Services Individually
You can run individual scripts from the root directory using npm workspaces:

- **Run Backend only:**
  ```bash
  npm run dev:backend
  ```
- **Run Customer Frontend only:**
  ```bash
  npm run dev:frontend
  ```
- **Run Staff Dashboard only:**
  ```bash
  npm run dev:staff
  ```

Alternatively, you can navigate into any subdirectory and run commands local to that project:
```bash
cd backend
npm run dev
```

## Recommended File Naming Conventions
- **Frontend / Dashboard components**: PascalCase (e.g., `OrderSummary.jsx`, `MenuItemCard.jsx`).
- **Styles / CSS files**: lowercase kebab-case (e.g., `menu-item.css`, `index.css`).
- **Utility / Config scripts**: camelCase (e.g., `db.js`, `errorHandler.js`, `authHelper.js`).
- **Backend controller/route files**: camelCase (e.g., `orderController.js`, `orderRoutes.js`).
