from fastapi import APIRouter
import database
import schemas
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.get("")
def list_payments():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM payments ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("")
def process_payment(req: schemas.PaymentRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    txn_ref = f"TXN-{uuid.uuid4().hex[:9].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    cursor.execute(
        '''INSERT INTO payments (invoice_id, patient_name, amount, payment_method, transaction_ref, status, date)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (req.invoice_id, req.patient_name, req.amount, req.payment_method, txn_ref, "Completed", now_str)
    )
    conn.commit()
    conn.close()
    return {
        "success": True,
        "transaction_ref": txn_ref,
        "amount": req.amount,
        "status": "Completed",
        "message": f"Payment of ₹{req.amount:.2f} processed successfully via {req.payment_method}!"
    }


@router.delete("/{payment_id}")
def delete_payment(payment_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM payments WHERE id = ?", (payment_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Payment record deleted successfully"}
