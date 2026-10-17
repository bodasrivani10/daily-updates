from backend.models.base import SessionLocal
from backend.models.db_models import DuplicateMatch, SourceMessage
from backend.services.state_resolution import resolve_work_item_states

db = SessionLocal()
d1 = db.query(DuplicateMatch).delete()
d2 = db.query(SourceMessage).filter(SourceMessage.is_duplicate == True).delete()
db.commit()
resolve_work_item_states(db)
db.close()
print(f"CLEARED: {d1} duplicate matches, {d2} duplicate messages removed from SQLite database.")
