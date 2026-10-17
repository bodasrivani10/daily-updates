# ⚡ VELO BACKEND ARCHITECTURE & DATA FLOW GUIDE
**System**: VELO (AI Workspace Intelligence Platform)  
**Storage**: SQLite Database (`dailysignal.db`) managed via SQLAlchemy 2.0 ORM  
**Framework**: FastAPI (Python 3.14)

---

## 1. High-Level Explanation (In Simple Words)

Think of VELO's backend as a 3-part engine:

```
┌────────────────────────┐      ┌──────────────────────────┐      ┌─────────────────────────┐
│     1. INGESTION       │ ---> │  2. DETERMINISTIC ENGINE │ ---> │       3. STORAGE        │
│ Updates from Slack,    │      │  • Deduplication         │      │ SQLite (`dailysignal.db`)│
│ Outlook, Teams, Gmail  │      │  • Blocker Extraction    │      │ Relational tables with  │
│ or Employee Summaries  │      │  • State Resolution      │      │ strict RBAC boundaries │
└────────────────────────┘      └──────────────────────────┘      └─────────────────────────┘
```

1. **Employees or integrations submit summaries**:
   Instead of uploading messy raw documents, employees write a simple progress summary (e.g., *"Completed auth unit tests; blocked by DevOps staging key"*).
2. **The 7-Stage Pipeline processes it**:
   - **Step 1: Ingestion**: Reads the text and channel (Slack, Outlook, Teams, Gmail).
   - **Step 2: Validation**: Checks if the message format is valid.
   - **Step 3: Deduplication**: Compares against existing records using SHA-256 hashes and fuzzy similarity ($\ge 80\%$) so accidental duplicate submissions are safely dismissed.
   - **Step 4: Grouping**: Maps the update to the corresponding work item / task ID.
   - **Step 5: State Resolution**: Evaluates if the task is `in_progress`, `blocked`, or ready for completion.
   - **Step 6: Blocker & Conflict Detection**: Flags blockers and contradictory claims.
   - **Step 7: Cited Digest Generation**: Generates daily reports with clickable source citations.
3. **Database writes**:
   Everything is stored cleanly in `dailysignal.db`.

---

## 2. Directory Structure & What Each File Does

```
backend/
├── main.py                     # Entry point: Starts FastAPI, configures CORS, seeds initial data.
│
├── models/
│   ├── base.py                 # SQLite engine configuration (`sqlite:///./dailysignal.db`).
│   ├── db_models.py            # Database tables (Users, Projects, WorkItems, SourceMessages, etc.).
│   └── schemas.py              # Pydantic schemas for request/response JSON validation.
│
├── api/
│   ├── auth.py                 # RBAC user header extraction (`X-User-Id`).
│   ├── projects_teams.py       # Users, rosters, invitations, tasks, and duplicate clearance.
│   ├── work_items.py           # Work item listings, details, and status updates (Complete/Reassign).
│   ├── blockers.py             # Blocker detection and resolution endpoints.
│   ├── conflicts.py            # Owner & statement conflict resolution.
│   ├── digests.py              # 4-section cited digest generator.
│   └── evaluation.py           # 10 benchmark test scenarios.
│
├── services/
│   ├── deduplication.py        # 3-tier duplicate detection logic.
│   ├── blocker_detection.py    # Pattern matching for technical blockers.
│   ├── state_resolution.py     # Deterministic state machine (prevents premature completion).
│   └── seed_data.py            # Initial pre-seeded users, projects, and rosters.
│
└── tests/                      # Automated test suite (12 tests passing).
```

---

## 3. How the Manager & Employee Actions Interact with the Database

| Action | API Endpoint | What Happens in the Database |
| :--- | :--- | :--- |
| **Employee submits task summary** | `POST /api/imports` | 1. Creates `SourceMessage`<br>2. Screens duplicates (`DuplicateMatch`)<br>3. Updates `WorkItem.resolved_status` |
| **Manager verifies & completes task** | `PATCH /api/work-items/{id}/status` | Sets `resolved_status = 'completed'` and logs an audit record in `WorkItemEvent`. |
| **Manager gives work to another employee** | `POST /api/projects-teams/assign-task` | Updates `WorkItem.assigned_to_user_id` and registers task ownership. |
| **Manager searches 100+ employees** | Filter in `ManagerDashboard.tsx` | Filters local roster or calls `GET /api/projects-teams/users` with instant sub-millisecond search. |
| **Clearing duplicates** | `POST /api/projects-teams/duplicates/clear` | Deletes redundant duplicate records and updates SQLite cleanly. |
