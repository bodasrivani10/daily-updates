import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models.base import Base, engine, SessionLocal
from .api import imports, work_items, conflicts, blockers, digests, evaluation, projects_teams, slack, email_integration
from .services.seed_data import seed_initial_users_and_projects

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Auto seed default users, managers, and projects if empty
with SessionLocal() as db_session:
    seed_initial_users_and_projects(db_session)

app = FastAPI(
    title="DailySignal AI API",
    description="Evidence-driven daily update and summary platform with 7-stage processing pipeline and citation tracing.",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(projects_teams.router)
app.include_router(imports.router)
app.include_router(work_items.router)
app.include_router(conflicts.router)
app.include_router(blockers.router)
app.include_router(digests.router)
app.include_router(evaluation.router)
app.include_router(slack.router)
app.include_router(email_integration.router)


@app.get("/")
def root():
    return {
        "service": "DailySignal AI",
        "status": "operational",
        "stages": [
            "1. Ingestion",
            "2. Validation & Normalization",
            "3. Deduplication",
            "4. Work Item Grouping",
            "5. State Resolution",
            "6. Conflict & Blocker Detection",
            "7. Cited Digest Generation"
        ],
        "dashboards": [
            "1. Employee Dashboard (Isolated work items, Import updates, Invitations)",
            "2. Manager Dashboard (10-20 member roster, Task assignment, Feedback, Audit trail)",
            "3. Director / CEO Dashboard (Company-wide projects, Global employee search, Audit changes)"
        ],
        "docs_url": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
