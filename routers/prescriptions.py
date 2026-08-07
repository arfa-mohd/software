from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import schemas
import crud

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

@router.get("")
def list_prescriptions():
    return crud.get_prescriptions()

@router.post("")
def create_prescription(req: schemas.PrescriptionRequest):
    try:
        presc_id = crud.create_prescription(
            appointment_id=req.appointment_id,
            diagnosis=req.diagnosis,
            medicines=req.medicines,
            advice=req.advice,
            next_visit=req.next_visit
        )
        return {"success": True, "prescription_id": presc_id, "message": "Prescription issued successfully!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class PrescriptionUpdateRequest(BaseModel):
    diagnosis: str
    medicines: List[schemas.MedicineItem]
    advice: str
    next_visit: str

@router.put("/{prescription_id}")
def update_prescription(prescription_id: int, req: PrescriptionUpdateRequest):
    try:
        crud.update_prescription(
            prescription_id=prescription_id,
            diagnosis=req.diagnosis,
            medicines=req.medicines,
            advice=req.advice,
            next_visit=req.next_visit
        )
        return {"success": True, "message": "Prescription updated successfully!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{prescription_id}")
def delete_prescription(prescription_id: int):
    try:
        crud.delete_prescription(prescription_id)
        return {"success": True, "message": "Prescription deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
