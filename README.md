# DailySignal (VELO)

DailySignal is a work-update and team-coordination platform. It collects employee updates, links them to work items, identifies duplicates, blockers, and conflicting information, and presents role-specific dashboards and cited digests.

## Features

- Submit and import work updates from supported sources.
- Match updates to work items and detect duplicate submissions.
- Identify blockers and conflicting status reports.
- Generate daily digests with source citations.
- Manage projects, teams, invitations, task assignments, and feedback.
- Enforce role-based data access for employees, managers, and directors.
- Provide API documentation through FastAPI's Swagger UI.

### Dashboards

| Role | Main view |
| --- | --- |
| Employee | Personal work items, invitations, progress updates, and feedback |
| Manager | Team roster, task assignments, team progress, blockers, and audit history |
| Director / CEO | Organization-wide projects, work items, metrics, employee search, and audit visibility |

## Technology

- **Frontend:** React 18, TypeScript, Vite, and Tailwind CSS
- **Backend:** Python, FastAPI, Pydantic, and SQLAlchemy
- **Database:** SQLite by default
- **Tests:** pytest

## Requirements

- Python 3.10 or later
- Node.js and npm

## Run locally on Windows

Open PowerShell in the project root (the directory containing this README).

1. Install the backend dependencies:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

2. Start the backend in that terminal:

   ```powershell
   python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```

   The API is at `http://localhost:8000`. Interactive API documentation is at `http://localhost:8000/docs`, and the health endpoint is `http://localhost:8000/health`.

3. Open a second PowerShell window in the project root and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the local URL printed by Vite (by default, `http://localhost:5173`). The Vite development server proxies `/api` requests to the backend on port 8000.

Alternatively, run `start_app.bat` from the project root to launch both development servers and open the frontend in a browser.

## Configuration and data

The backend creates its database tables and seeds initial sample users and projects when it starts. By default, the SQLite database file is `dailysignal.db` in the backend process's working directory. Set `SQLITE_DB_PATH` before starting the backend to use a different database filename.

For a separately hosted frontend, set `VITE_API_URL` to the backend API base URL, including `/api` when required. In local development, the Vite proxy makes this setting unnecessary.

## Run tests and build the frontend

From the project root:

```powershell
python -m pytest backend/tests
```

To type-check and build the frontend:

```powershell
cd frontend
npm run build
```

## Project layout

```text
backend/
  api/       FastAPI routes
  models/    SQLAlchemy models and Pydantic schemas
  services/  Update processing and business logic
  tests/     Backend tests
frontend/
  src/       React application, dashboards, and API client
docs/        Architecture and deployment guides
```

For more detail, see [docs/BACKEND_ARCHITECTURE_GUIDE.md](docs/BACKEND_ARCHITECTURE_GUIDE.md) and [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
