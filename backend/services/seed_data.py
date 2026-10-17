from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..models.db_models import User, Project, TeamMembership


def seed_initial_users_and_projects(db: Session):
    """
    Seeds initial organizational roster and projects if not already present.
    Includes:
    - 1 Director / CEO (Elena Vance)
    - 2 Managers (Marcus Sterling - Team A Lead, Priya Sharma - Team B Lead)
    - 12 Employees (6 in Team A, 6 in Team B, with some multi-team contributors)
    - 4 Projects (Core Platform, Payment Gateway, Data Analytics, Auth Infrastructure)
    """
    if db.query(User).count() > 0:
        return

    users_data = [
        # Leadership
        {"id": 1, "username": "elena_ceo", "name": "Elena Vance", "role": "director_ceo", "department": "Executive"},
        
        # Managers
        {"id": 2, "username": "marcus_lead", "name": "Marcus Sterling", "role": "manager", "department": "Core Platform"},
        {"id": 3, "username": "priya_lead", "name": "Priya Sharma", "role": "manager", "department": "Payments & Infra"},

        # Team Marcus Employees (Team Alpha)
        {"id": 4, "username": "Asha", "name": "Asha Patel", "role": "employee", "department": "API Engineering"},
        {"id": 5, "username": "carlos_dev", "name": "Carlos Gomez", "role": "employee", "department": "Backend"},
        {"id": 6, "username": "maya_qa", "name": "Maya Lin", "role": "employee", "department": "Quality Assurance"},
        {"id": 7, "username": "liam_eng", "name": "Liam Scott", "role": "employee", "department": "Frontend"},
        {"id": 8, "username": "sophia_fe", "name": "Sophia Zhang", "role": "employee", "department": "Design & UI"},
        {"id": 9, "username": "alex_sec", "name": "Alex Rivera", "role": "employee", "department": "SecOps"},

        # Team Priya Employees (Team Beta)
        {"id": 10, "username": "Devin", "name": "Devin Clark", "role": "employee", "department": "Data Engineering"},
        {"id": 11, "username": "zack_data", "name": "Zack Miller", "role": "employee", "department": "Analytics"},
        {"id": 12, "username": "chloe_dev", "name": "Chloe Bennett", "role": "employee", "department": "Payments"},
        {"id": 13, "username": "jordan_dev", "name": "Jordan Lee", "role": "employee", "department": "Infrastructure"},
        {"id": 14, "username": "tariq_ops", "name": "Tariq Mansour", "role": "employee", "department": "DevOps"},
        {"id": 15, "username": "zoe_crypto", "name": "Zoe Sanders", "role": "employee", "department": "Security"}
    ]

    for ud in users_data:
        u = User(
            id=ud["id"],
            username=ud["username"],
            name=ud["name"],
            email=f"{ud['username'].lower()}@enterprise.internal",
            role=ud["role"],
            department=ud["department"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(u)
    db.commit()

    # Seed Projects
    projects_data = [
        {"id": "PRJ-ALPHA", "name": "Core Platform & API Services", "created_by_manager_id": 2, "description": "High throughput microservices API gateway and integration tests."},
        {"id": "PRJ-PAY", "name": "Payment Gateway v2 Migration", "created_by_manager_id": 3, "description": "PCI-compliant payment processor migration and multi-currency ledger."},
        {"id": "PRJ-DATA", "name": "BigData Pipeline & Reporting", "created_by_manager_id": 3, "description": "Spark/dbt ETL pipelines powering executive and partner dashboards."},
        {"id": "PRJ-AUTH", "name": "Zero-Trust Identity & SecOps", "created_by_manager_id": 2, "description": "OAuth2 scope expansion, PKI credential rotation, and vault access."}
    ]

    for pd in projects_data:
        p = Project(
            id=pd["id"],
            name=pd["name"],
            description=pd["description"],
            created_by_manager_id=pd["created_by_manager_id"],
            status="active",
            created_at=datetime.now(timezone.utc)
        )
        db.add(p)
    db.commit()

    # Seed Team Memberships
    # Team Alpha (Marcus Sterling as manager)
    team_alpha_emps = [4, 5, 6, 7, 8, 9]
    for uid in team_alpha_emps:
        m = TeamMembership(
            user_id=uid,
            project_id="PRJ-ALPHA",
            manager_id=2,
            role_in_team="core_contributor",
            status="accepted"
        )
        db.add(m)

    # Team Beta (Priya Sharma as manager)
    team_beta_emps = [10, 11, 12, 13, 14, 15]
    for uid in team_beta_emps:
        m = TeamMembership(
            user_id=uid,
            project_id="PRJ-PAY",
            manager_id=3,
            role_in_team="lead_engineer",
            status="accepted"
        )
        db.add(m)

    # Multi-team example: Carlos (5) and Asha (4) also invited to PRJ-AUTH & PRJ-DATA
    db.add(TeamMembership(user_id=4, project_id="PRJ-AUTH", manager_id=2, role_in_team="security_lead", status="accepted"))
    db.add(TeamMembership(user_id=5, project_id="PRJ-PAY", manager_id=3, role_in_team="migration_eng", status="accepted"))
    # Pending invitation for Maya Lin to PRJ-PAY
    db.add(TeamMembership(user_id=6, project_id="PRJ-PAY", manager_id=3, role_in_team="qa_specialist", status="pending"))
    db.commit()
