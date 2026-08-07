from fastapi import APIRouter
import database
import schemas
import json
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/pharmacy", tags=["Pharmacy Inventory"])

@router.get("/items")
def get_pharmacy_items():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pharmacy_items")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/invoices")
def get_pharmacy_invoices():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pharmacy_invoices ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/add")
def add_pharmacy_item(req: schemas.PharmacyItemCreate):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    batch = f"BAT-{uuid.uuid4().hex[:4].upper()}"
    cursor.execute('''
        INSERT INTO pharmacy_items (name, category, stock_qty, unit_price, expiry_date, batch_no, manufacturer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        req.name, req.category, req.stock_qty, req.unit_price,
        req.expiry_date or "2026-12-31", batch, req.manufacturer or "Generic Pharma"
    ))
    conn.commit()
    item_id = cursor.lastrowid
    conn.close()
    return {"status": "success", "message": "Medicine added successfully", "id": item_id}



@router.delete("/items/{item_id}")
def delete_pharmacy_item(item_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pharmacy_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Pharmacy item deleted successfully"}
