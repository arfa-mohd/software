from fastapi import APIRouter
import schemas
import crud

router = APIRouter(prefix="/api/emergency", tags=["Emergency SOS"])

@router.get("")
def list_emergencies():
    return crud.get_emergencies()

@router.post("/sos")
def trigger_sos(req: schemas.EmergencyRequest):
    return crud.create_emergency(
        caller_name=req.caller_name,
        caller_phone=req.caller_phone,
        location=req.location,
        priority=req.priority or "CRITICAL - LEVEL 1"
    )
