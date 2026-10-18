import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models.base import Base, engine, SessionLocal
from .models import db_models
from .api import imports, work_items, conflicts, blockers, digests, evaluation, projects_teams, slack, email_integration
from .services.seed_data import seed_initial_users_and_projects

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Auto seed default users, managers, and projects if empty
try:
    with SessionLocal() as db_session:
        seed_initial_users_and_projects(db_session)
except Exception as e:
    print(f"Warning: Database auto-seed encountered: {e}")

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


@app.get("/api")
def api_info():
    return {
        "service": "DailySignal AI",
        "status": "operational",
        "docs_url": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# Mount frontend React build (serves the complete UI directly from Render)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        # Don't intercept API or docs routes
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

