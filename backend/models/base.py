from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

# Database configuration: defaults to XAMPP MySQL (root user, no password, port 3306)
# Can be overridden via DATABASE_URL or DB_TYPE=sqlite
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    db_type = os.getenv("DB_TYPE", "mysql").lower()
    if db_type == "sqlite":
        db_file = os.getenv("SQLITE_DB_PATH", "dailysignal.db")
        DATABASE_URL = f"sqlite:///./{db_file}"
    else:
        # Standard XAMPP MySQL credentials
        mysql_user = os.getenv("MYSQL_USER", "root")
        mysql_pass = os.getenv("MYSQL_PASSWORD", "")
        mysql_host = os.getenv("MYSQL_HOST", "localhost")
        mysql_port = os.getenv("MYSQL_PORT", "3306")
        mysql_db = os.getenv("MYSQL_DB", "dailysignal")
        
        # Build connection string
        auth = f"{mysql_user}:{mysql_pass}" if mysql_pass else mysql_user
        DATABASE_URL = f"mysql+pymysql://{auth}@{mysql_host}:{mysql_port}/{mysql_db}?charset=utf8mb4"

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

