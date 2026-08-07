from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import database
import schemas

router = APIRouter(prefix="/api/patients", tags=["Patients"])

class PatientUpdate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = ""
    blood_group: Optional[str] = "O+"
    allergies: Optional[str] = "None"
    insurance_provider: Optional[str] = ""
    policy_no: Optional[str] = ""
    medical_history: Optional[str] = ""

@router.get("")
def list_patients():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/add")
@router.post("")
def add_patient(req: schemas.PatientCreate):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO patients (name, age, gender, phone, email, blood_group, allergies, insurance_provider, policy_no, medical_history)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        req.name, req.age, req.gender, req.phone,
        req.email or "", req.blood_group or "O+",
        req.allergies or "None", req.insurance_provider or "Star Health Insurance",
        f"POL-{req.phone[-4:] if len(req.phone) >= 4 else '1001'}",
        req.medical_history or "No chronic conditions reported."
    ))
    conn.commit()
    patient_id = cursor.lastrowid
    
    # Auto-provision Patient Document Cabinet Folder
    try:
        cursor.execute("INSERT INTO patient_folders (patient_name) VALUES (?)", (req.name,))
        conn.commit()
        folder_id = cursor.lastrowid
        os.makedirs(f"static/uploads/patients/{folder_id}", exist_ok=True)
    except Exception as e:
        print("Folder auto-provision skipped:", e)
        
    conn.close()
    return {"status": "success", "message": "Patient added successfully", "id": patient_id}

import os
import shutil
from fastapi import UploadFile, File, Form, HTTPException

class FolderCreate(BaseModel):
    patient_name: str

@router.get("/folders")
def list_folders():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patient_folders ORDER BY patient_name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/folders")
def create_folder(req: FolderCreate):
    name = req.patient_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Patient Name cannot be empty")
        
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO patient_folders (patient_name) VALUES (?)", (name,))
        conn.commit()
        folder_id = cursor.lastrowid
        
        # Create folder directory on disk
        upload_dir = f"static/uploads/patients/{folder_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        conn.close()
        return {"success": True, "message": "Folder created successfully", "id": folder_id}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Folder already exists or error: {str(e)}")

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # Delete database records
    cursor.execute("DELETE FROM patient_documents WHERE folder_id = ?", (folder_id,))
    cursor.execute("DELETE FROM patient_folders WHERE id = ?", (folder_id,))
    conn.commit()
    conn.close()
    
    # Delete folder directory on disk
    upload_dir = f"static/uploads/patients/{folder_id}"
    if os.path.exists(upload_dir):
        try:
            shutil.rmtree(upload_dir)
        except Exception as e:
            print("Failed to delete patient upload folder directory", e)
            
    return {"success": True, "message": "Folder deleted successfully"}

@router.get("/folders/{folder_id}/files")
def list_files(folder_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patient_documents WHERE folder_id = ? ORDER BY uploaded_at DESC", (folder_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/folders/{folder_id}/upload")
def upload_patient_file(folder_id: int, file: UploadFile = File(...)):
    # Check if folder exists
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patient_folders WHERE id = ?", (folder_id,))
    folder = cursor.fetchone()
    if not folder:
        conn.close()
        raise HTTPException(status_code=404, detail="Patient folder not found")
        
    filename = file.filename
    # Clean filename
    clean_filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in "._- "]).strip()
    if not clean_filename:
        clean_filename = "document"
        
    upload_dir = f"static/uploads/patients/{folder_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = f"/static/uploads/patients/{folder_id}/{clean_filename}"
    disk_path = os.path.join(upload_dir, clean_filename)
    
    # Save file to disk
    try:
        with open(disk_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save file to disk: {str(e)}")
        
    # Get file size
    file_size = os.path.getsize(disk_path)
    
    # Save record to database
    cursor.execute('''
        INSERT INTO patient_documents (folder_id, filename, file_path, file_size)
        VALUES (?, ?, ?, ?)
    ''', (folder_id, clean_filename, file_path, file_size))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "File uploaded successfully", "file_path": file_path}

@router.delete("/documents/{doc_id}")
def delete_patient_file(doc_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patient_documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc_dict = dict(doc)
    file_path = doc_dict["file_path"]
    
    # Delete from database
    cursor.execute("DELETE FROM patient_documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    
    # Delete from disk
    disk_path = file_path.lstrip("/")
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except Exception as e:
            print("Failed to delete file from disk", e)
            
    return {"success": True, "message": "Document deleted successfully"}

@router.get("/{patient_id}")
def get_patient_detail(patient_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    patient = cursor.fetchone()
    if not patient:
        conn.close()
        return {}
    p_dict = dict(patient)
    
    # Get patient appointments history
    cursor.execute("SELECT * FROM appointments WHERE patient_phone = ?", (p_dict["phone"],))
    p_dict["appointments"] = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    return p_dict

@router.put("/{patient_id}")
def update_patient(patient_id: int, req: PatientUpdate):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE patients 
        SET name = ?, age = ?, gender = ?, phone = ?, email = ?, 
            blood_group = ?, allergies = ?, insurance_provider = ?, 
            policy_no = ?, medical_history = ?
        WHERE id = ?
    ''', (
        req.name, req.age, req.gender, req.phone, req.email or "",
        req.blood_group or "O+", req.allergies or "None", 
        req.insurance_provider or "", req.policy_no or "", 
        req.medical_history or "", patient_id
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Patient updated successfully"}

@router.delete("/{patient_id}")
def delete_patient(patient_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Patient deleted successfully"}


