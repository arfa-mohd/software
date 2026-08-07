from fastapi import APIRouter
import database
import schemas
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/lab", tags=["Lab Diagnostics"])

@router.get("/tests")
def get_lab_tests():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lab_tests")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/bookings")
def get_lab_bookings():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lab_bookings ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/book")
def book_lab_test(req: schemas.LabBookingRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    code = f"LAB-{uuid.uuid4().hex[:4].upper()}"
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute(
        '''INSERT INTO lab_bookings (booking_code, patient_name, phone, test_name, date, status, result_summary)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (code, req.patient_name, req.phone, req.test_name, req.date or today_str, "Sample Collected", "Processing in Pathology Lab")
    )
    conn.commit()
    conn.close()
    return {"success": True, "booking_code": code, "message": "Lab test scheduled successfully!"}


@router.delete("/bookings/{booking_id}")
def delete_lab_booking(booking_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lab_bookings WHERE id = ?", (booking_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Lab booking deleted successfully"}

@router.delete("/tests/{test_id}")
def delete_lab_test(test_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lab_tests WHERE id = ?", (test_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Lab test deleted successfully"}
