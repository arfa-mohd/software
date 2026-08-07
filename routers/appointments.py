from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import schemas
import crud
import database

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

class AppointmentUpdate(BaseModel):
    patient_name: str
    patient_phone: str
    symptoms: str
    status: str
    appointment_date: Optional[str] = None
    time_slot: Optional[str] = None

@router.get("")
def get_appointments(
    status: Optional[str] = Query(None),
    doctor_id: Optional[int] = Query(None),
    date: Optional[str] = Query(None),
    booking_source: Optional[str] = Query(None)
):
    return crud.get_appointments(status, doctor_id, date, booking_source)

@router.get("/{appointment_id}")
def get_appointment_detail(appointment_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return dict(row)

@router.post("")
def book_appointment(req: schemas.BookingRequest):
    try:
        res = crud.create_appointment(req.dict())
        return {
            "success": True,
            "message": "Appointment booked successfully",
            "data": res
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{appointment_id}/status")
def update_status(appointment_id: int, req: schemas.StatusUpdateRequest):
    crud.update_appointment_status(appointment_id, req.status, req.consultation_notes, req.room_no)
    return {"success": True, "message": f"Status updated to {req.status}"}

@router.put("/{appointment_id}")
def update_appointment(appointment_id: int, req: AppointmentUpdate):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE appointments 
        SET patient_name = ?, patient_phone = ?, symptoms = ?, status = ?, appointment_date = ?, time_slot = ?
        WHERE id = ?
    ''', (req.patient_name, req.patient_phone, req.symptoms, req.status, req.appointment_date, req.time_slot, appointment_id))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Appointment updated successfully"}

@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Appointment deleted successfully"}

