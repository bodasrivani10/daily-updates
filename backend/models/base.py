from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

# Database connection configuration:
# 1. Cloud: Render sets DATABASE_URL (often postgres:// which SQLAlchemy needs as postgresql://)
# 2. Local MySQL: XAMPP MySQL
# 3. Fallback: SQLite
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "mysql+pymysql://root:@localhost:3306/dailysignal"

# Fix Render PostgreSQL prefix if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
