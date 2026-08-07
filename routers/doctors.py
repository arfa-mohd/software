from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import crud

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("")
def list_doctors(department_id: Optional[int] = Query(None)):
    return crud.get_doctors(department_id)

@router.get("/departments")
def list_departments():
    return crud.get_departments()

@router.get("/{doctor_id}")
def get_doctor(doctor_id: int):
    doc = crud.get_doctor_by_id(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc

@router.get("/{doctor_id}/slots")
def get_slots(doctor_id: int, date: str = Query(...)):
    return crud.get_doctor_slots(doctor_id, date)
