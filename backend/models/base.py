from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

# Database connection configuration (MySQL via XAMPP with fallback to SQLite)
DEFAULT_MYSQL_URL = "mysql+pymysql://root:@localhost:3306/dailysignal"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_MYSQL_URL)

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
