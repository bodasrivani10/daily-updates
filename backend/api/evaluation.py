from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..models.base import get_db
from ..models.schemas import EvaluationReport
from ..services.evaluation_service import run_comprehensive_evaluation

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])


@router.get("", response_model=EvaluationReport)
def get_evaluation_metrics(db: Session = Depends(get_db)):
    """
    Runs automated benchmark suite evaluating all 10 scenarios and 6 metric scores.
    """
    results = run_comprehensive_evaluation(db)
    return results


@router.post("/run", response_model=EvaluationReport)
def trigger_evaluation_run(db: Session = Depends(get_db)):
    """
    Triggers fresh benchmark run.
    """
    results = run_comprehensive_evaluation(db)
    return results
