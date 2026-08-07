from fastapi import APIRouter
import schemas
import crud

router = APIRouter(prefix="/api/beds", tags=["Bed Tracker"])

@router.get("")
def list_beds():
    return crud.get_beds()

@router.put("/{bed_id}")
def update_bed(bed_id: int, req: schemas.BedUpdateRequest):
    crud.update_bed(bed_id, req.status, req.patient_name or "N/A")
    return {"success": True, "message": f"Bed {bed_id} updated to {req.status}"}
