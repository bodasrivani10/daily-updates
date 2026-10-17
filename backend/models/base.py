from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

# SQLite database file configuration
DB_FILE = os.getenv("SQLITE_DB_PATH", "dailysignal.db")
DATABASE_URL = f"sqlite:///./{DB_FILE}"

# check_same_thread=False is required for multi-threaded SQLite access in FastAPI
connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
