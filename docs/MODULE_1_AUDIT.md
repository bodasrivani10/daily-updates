# MODULE 1 AUDIT REPORT — C15 PROJECT AUDIT
**Project**: Fynd × NMIMS C15 Advanced Daily Summary Agent (DailySignal AI)  
**Audit Date**: 2026-10-18  
**Audit Scope**: Module 1 — Architecture Inspection, Tenant & RBAC Isolation, C15 Fixture Audit, Verification & Minimal Cleanup  
**Status**: PASS

---

## 1. Current Architecture

The platform is structured as an evidence-driven, multi-tenant project management, update ingestion, and intelligence system with strict role boundaries:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          React 18 + Vite Frontend                               │
│  (Tailwind CSS, Recharts, Lucide Icons, Vite Proxy: /api -> localhost:8000)     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Dashboard 1: Employee Dashboard (Isolated tasks, invitations, feedback)      │
│  • Dashboard 2: Manager / Lead Dashboard (Rosters, task assignment, audit)      │
│  • Dashboard 3: Director / CEO Dashboard (Org portfolio, search, changes audit) │
│  • Engine Views: Imports, Work Items, Conflicts & Blockers, Digest, Benchmarks  │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTP / REST (X-User-Id Simulated RBAC)
┌──────────────────────────────────────▼──────────────────────────────────────────┐
│                            FastAPI Backend                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • API Routers:                                                                 │
│    - /api/projects-teams (Users, Projects, Invitations, Rosters, Tasks, Search) │
│    - /api/work-items (RBAC-filtered work item state tracking & details)         │
│    - /api/imports (CSV/JSON ingestion, structural/semantic validation)          │
│    - /api/conflicts (Claim contradictions & owner dispute resolution)           │
│    - /api/blockers (Deterministic rule-based blocker extraction & triaging)     │
│    - /api/digests (Four-section cited daily digests backed by evidence links)   │
│    - /api/evaluation (10 automated benchmark scenarios & metric validation)     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Deterministic Engine Pipeline:                                               │
│    1. Ingestion -> 2. Validation -> 3. Deduplication (3-Tier) ->                │
│    4. Work Item Grouping -> 5. State Resolution -> 6. Blocker/Conflict Detect ->│
│    7. Cited Digest Generation                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Database Layer:                                                              │
│    SQLite (`dailysignal.db`) managed via SQLAlchemy 2.0 ORM                     │
│    Models: User, Project, TeamMembership, WorkItem, SourceMessage, ImportBatch, │
│            DuplicateMatch, WorkItemEvent, StatusHistory, ConflictRecord,        │
│            BlockerRecord, Feedback, AuditLog, Digest, DigestClaim               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. What Already Works & Verification Evidence

1. **Deterministic Multi-Tier Deduplication**:
   - Exact source ID match (database and batch uniqueness).
   - Content hash match (SHA-256 normalized whitespace hashing).
   - Near-duplicate fuzzy matching ($\ge 80\%$ sequence ratio) preserving original source evidence.
   - *Evidence*: `tests/test_deduplication.py` PASS (0.33s).
2. **Explicit State-Resolution Engine**:
   - Status model (`not_started`, `in_progress`, `blocked`, `completed`, `unknown`, `conflict`).
   - Prevents marking items completed when blocking dependencies or active test failures exist.
   - Clarifications separating subtask completion from release readiness.
   - *Evidence*: `tests/test_state_resolution.py` PASS.
3. **Deterministic Conflict & Blocker Detection**:
   - Ownership mismatch and status contradiction detection without premature overwrites.
   - Blocker extraction with issue text, impact, severity, owner, and recommended next actions.
   - *Evidence*: `tests/test_conflicts.py` and `tests/test_blockers.py` PASS.
4. **100% Traceable Cited Daily Digest**:
   - Compiles Confirmed Progress, Blockers & Risks, Next Actions, and Conflicts/Reviews.
   - Every claim links directly to source message IDs.
   - *Evidence*: `tests/test_digest_citations.py` PASS.
5. **Multi-Tenant RBAC & Employee Isolation**:
   - Employees cannot view peer work items, updates, or submissions.
   - Cross-manager team boundaries strictly segregate project updates.
   - Director/CEO accesses organization-wide summaries and audit trail.
   - *Evidence*: `tests/test_multi_tenant_isolation.py` PASS (3 isolated test scenarios).
6. **Frontend Dashboards & Live Backend Connection**:
   - Live connected via Vite proxy to FastAPI backend (`http://127.0.0.1:8000`).
   - Dynamic user switcher in navigation bar seamlessly demonstrates multi-tenant permissions.
   - *Evidence*: `npm run build` compiles 0 errors; HTTP probe 200 on both frontend (5173) and backend (8000).

---

## 3. What Must Be Replaced or Fixed (Module 1 Scope)

* **Completed in this audit**:
  - Resolved an `SAWarning` in `backend/api/work_items.py` regarding raw subquery coercion into `IN()` clauses by replacing it with an explicit distinct list query.
  - Aligned TypeScript interface `EvaluationReport` in `frontend/src/types/index.ts` with backend keys (`scenario`, `expected`, `detail`, `fact_id`, `recovered`, `target_item`, `resolved_status`).
  - Added missing helper methods to `frontend/src/services/api.ts` (`updateBlockerStatus`, `exportDigest`, `getEvaluation`).
* **Technical Debt for Future Consideration**:
  - The simulated user header (`X-User-Id`) provides immediate testing and role switching; production authentication (JWT / session tokens) should replace header-based simulation in later modules.
  - Large bundle size warning (`index-B9x_FR4F.js` is ~640 kB minified) due to Recharts; dynamic `import()` code-splitting should be introduced when optimizing production packaging.

---

## 4. Reusable Components

* **Frontend**:
  - `Navbar.tsx`: Role switcher and active dashboard router.
  - `StatusBadge.tsx`: Consistent color-coded state chips for the status model.
  - `MetricCard.tsx`: Metric summary cards with percentage changes and indicators.
  - `CitationBadge.tsx` & `CitationModal.tsx`: Source citation inspection popover tracing exact raw records.
  - `PipelineStepper.tsx`: Visual indicator for the 7 processing stages.
* **Backend**:
  - `backend/services/ingestion.py`: CSV and JSON parsers with ISO timestamp normalization.
  - `backend/services/validation.py`: Pydantic structural and business consistency checks.
  - `backend/services/deduplication.py`: 3-tier duplicate engine.
  - `backend/services/state_resolution.py`: Precedence-based deterministic state engine.
  - `backend/services/conflict_detection.py` & `backend/services/blocker_detection.py`: Pattern and phrase matching engines.
  - `backend/services/digest_generator.py`: Structured 4-section digest synthesizer.

---

## 5. Actual C15 Fixture Location & Validation

* **Path**: `backend/fixtures/starter_fixtures.json` (size: 3,348 bytes, 111 lines, 10 primary records).
* **Companion Fixture**: `backend/fixtures/sample_daily_updates.csv` (size: 1,639 bytes).
* **Structure**:
  - Validated JSON array of objects with keys: `source_id`, `timestamp`, `author`, `work_item_id`, `text`, `visibility`, `source_system`.
  - Timestamps normalized to ISO-8601 with offset (`2026-10-17T09:00:00+05:30`).
  - Contains exact-id duplicates (`msg-1049` GitHub PR cross-post) and near-duplicate bot cross-posts (`msg-1050` Slack cross-post).
  - Contains restricted visibility messages (`msg-1052` vault keys) validating security level filtering.

---

## 6. Five Critical Facts — Evaluation Strategy Only

*Without disclosing underlying factual claims or hardcoding them into business logic, the evaluation pipeline verifies:*

1. **Subtask vs. Release Blocker Distinction**:
   - *Strategy*: Verify that when a source update reports implementation progress while another reports downstream test/deployment failure on the same work item, the engine resolves the top-level state to `blocked` rather than prematurely `completed`, and separates both claims into their respective digest sections.
2. **External Dependency / Security Approval Bottleneck**:
   - *Strategy*: Verify that phrase patterns indicating external review/sign-off blocks are parsed into active blocker records with high severity, attributed external owners, and explicit next actions rather than silent inaction.
3. **Multi-Author Ownership Conflict**:
   - *Strategy*: Verify that incompatible claims of exclusive leadership or conflicting ownership across multiple authors trigger an `unresolved` conflict record of type `owner_mismatch` and flag the work item as `conflict`/`needs_review`.
4. **Cross-Service Latency Regression Propagation**:
   - *Strategy*: Verify that upstream telemetry regressions causing downstream consumer degradation are detected as critical blockers and linked to both the root cause work item and the impacted dashboard/service item.
5. **Cross-Platform Near-Duplicate Reconciliation**:
   - *Strategy*: Verify that identical commit or pull-request announcements across multiple systems (e.g., GitHub and Slack) are recognized via fuzzy text similarity, linked to the primary message, and counted without double-counting progress in the daily digest.

---

## 7. Integration Readiness

* **Database Connection**: SQLite connection pooling with `check_same_thread=False` and automatic table initialization on application startup.
* **REST API Surface**: Clean FastAPI OpenAPI/Swagger documentation available at `/docs`.
* **CORS & Proxying**: Vite configuration proxies `/api` requests to `http://localhost:8000` with CORS middleware configured on the FastAPI server.
* **Seed Pipeline**: `backend/services/seed_data.py` auto-initializes organization users, projects, and memberships if the database is unpopulated.

---

## 8. Security Findings

* **Positive**:
  - Employee isolation is strictly enforced in query construction; employees cannot query or read items outside their assignment or authored updates.
  - Multi-manager isolation prevents managers from accessing unassigned projects or subordinate teams belonging to other managers.
  - Restricted updates (`visibility: "restricted"`) trigger warnings for non-admin/security roles and are omitted from standard member digests.
* **Recommendations for Future Modules**:
  - Replace `X-User-Id` header authentication with secure HTTP-only session cookies or JWT tokens.
  - Introduce rate limiting on `/api/imports` to protect against denial-of-service via large payloads.

---

## 9. Files Changed & Reasons

* `backend/api/work_items.py`:
  - Replaced subquery coercion with an explicit distinct ID query to eliminate SQLAlchemy 2.0 `SAWarning`.
* `frontend/src/types/index.ts`:
  - Aligned `EvaluationReport` scenario and seeded fact keys with backend payloads.
* `frontend/src/services/api.ts`:
  - Added helper wrappers `updateBlockerStatus`, `exportDigest`, and `getEvaluation` to satisfy frontend page calls.
* `docs/MODULE_1_AUDIT.md`:
  - Created this comprehensive Module 1 audit report.

---

## 10. Verification Results Summary

* **Unit & Integration Tests**: 12/12 PASSED (`pytest -W error::UserWarning`) in 1.15s.
* **TypeScript & Frontend Build**: PASSED (`tsc && vite build`) with zero errors in 3.89s.
* **Backend Runtime Probe**: PASSED (`GET http://127.0.0.1:8000/api/projects-teams/users` returned HTTP 200, 15 users).
* **Frontend Runtime Probe**: PASSED (`GET http://localhost:5173/` returned HTTP 200).
