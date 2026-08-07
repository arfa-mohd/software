from fastapi import APIRouter
import schemas
from services import ai_service

router = APIRouter(prefix="/api/ai/triage", tags=["AI Triage"])

@router.post("", response_model=schemas.TriageResponse)
def evaluate_triage(req: schemas.TriageRequest):
    return ai_service.analyze_symptom_triage(
        symptoms=req.symptoms,
        age=req.age or 30,
        gender=req.gender or "Unspecified",
        severity=req.severity_self_rating or 3,
        duration=req.duration or "1-3 days",
        history=req.medical_history or "None"
    )
