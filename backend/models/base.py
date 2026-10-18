from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

# Database connection configuration:
# 1. Cloud / Render: uses DATABASE_URL if provided (e.g. PostgreSQL or MySQL URL)
# 2. Local fallback: If running on Render (RENDER env is set) or MySQL unreachable, fallback to SQLite
RENDER = os.getenv("RENDER")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    if RENDER:
        # On Render cloud without external DB, default to SQLite
        DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dailysignal.db")
        DATABASE_URL = f"sqlite:///{DB_PATH}"
    else:
        # On local machine, try XAMPP MySQL
        DATABASE_URL = "mysql+pymysql://root:@localhost:3306/dailysignal"

# Fix Render PostgreSQL prefix if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True
    )
    # Test connection
    with engine.connect() as test_conn:
        pass
except Exception as e:
    # If MySQL connection fails (e.g., in cloud or when XAMPP is off), fallback to SQLite
    print(f"Warning: Primary database connection failed ({e}). Falling back to SQLite.")
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dailysignal.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
