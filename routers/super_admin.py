from fastapi import APIRouter, HTTPException, Path, Body, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import database
import re
import os
import shutil

router = APIRouter(prefix="/api/super-admin", tags=["Arfa Super Admin Portal"])

class PageUpdate(BaseModel):
    title: str
    is_visible: int

class CustomPageCreate(BaseModel):
    key: str
    title: str
    subtitle: str
    icon: str
    columns: List[str]

@router.get("/pages")
def get_pages():
    try:
        return database.get_custom_pages()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/pages/{key}")
def update_page(key: str, payload: PageUpdate):
    try:
        # Clean inputs
        clean_title = payload.title.strip()
        if not clean_title:
            raise HTTPException(status_code=400, detail="Page title cannot be empty")
            
        success = database.update_page_visibility_and_name(key, payload.is_visible, clean_title)
        if not success:
            raise HTTPException(status_code=404, detail=f"Page with key '{key}' not found or update failed")
        return {"success": True, "message": f"Page '{key}' updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pages")
def create_page(payload: CustomPageCreate):
    try:
        # Validate key (must be alphanumeric/underscore)
        key = payload.key.strip().lower()
        key = re.sub(r'[^a-z0-9_]', '_', key)
        if not key or len(key) < 2:
            raise HTTPException(status_code=400, detail="Invalid page key. Must be alphanumeric & at least 2 characters.")
        
        # Check if already exists
        existing = database.get_custom_page_by_key(key)
        if existing:
            raise HTTPException(status_code=400, detail=f"Page with key '{key}' already exists.")
            
        # Clean title & subtitle
        title = payload.title.strip()
        subtitle = payload.subtitle.strip()
        icon = payload.icon.strip() or "fas fa-folder"
        columns = [col.strip() for col in payload.columns if col.strip()]
        
        if not title:
            raise HTTPException(status_code=400, detail="Page title is required")
        if not columns:
            raise HTTPException(status_code=400, detail="At least one database column is required")
            
        success = database.create_custom_page(key, title, subtitle, icon, columns)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create custom page or provision database table.")
            
        return {"success": True, "message": f"Custom page '{title}' created & table provisioned successfully.", "key": key}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/pages/{key}")
def delete_page(key: str):
    try:
        existing = database.get_custom_page_by_key(key)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Page with key '{key}' not found")
        if existing.get('is_custom') != 1:
            raise HTTPException(status_code=400, detail="Cannot delete built-in system modules")
            
        success = database.delete_custom_page(key)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete custom page.")
        return {"success": True, "message": f"Custom page '{key}' and its database table deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DYNAMIC TABLES DATA ENDPOINTS ---

@router.get("/dynamic/{table_name}")
def get_dynamic_data(table_name: str = Path(..., description="The name of the dynamic table starting with 'dyn_'")):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid table name format. Must start with 'dyn_'.")
    try:
        return database.get_dynamic_table_data(table_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dynamic/{table_name}")
def add_dynamic_row(table_name: str, payload: Dict[str, Any] = Body(...)):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid table name format.")
    try:
        success = database.add_dynamic_table_data(table_name, payload)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to insert data into dynamic table.")
        return {"success": True, "message": "Row added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/dynamic/{table_name}/{id}")
def update_dynamic_row(table_name: str, id: int, payload: Dict[str, Any] = Body(...)):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid table name format.")
    try:
        success = database.update_dynamic_table_data(table_name, id, payload)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update dynamic row.")
        return {"success": True, "message": "Row updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/dynamic/{table_name}/{id}")
def delete_dynamic_row(table_name: str, id: int):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid table name format.")
    try:
        success = database.delete_dynamic_table_data(table_name, id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete dynamic row.")
        return {"success": True, "message": "Row deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SettingsUpdate(BaseModel):
    software_name: str
    software_subtitle: str
    software_logo: Optional[str] = None

@router.get("/settings")
def get_settings():
    try:
        return database.get_system_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings")
def update_settings(payload: SettingsUpdate):
    try:
        settings_dict = {
            "software_name": payload.software_name,
            "software_subtitle": payload.software_subtitle
        }
        if payload.software_logo:
            settings_dict["software_logo"] = payload.software_logo
        
        success = database.update_system_settings(settings_dict)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings/logo")
def upload_logo(file: UploadFile = File(...)):
    try:
        # Validate extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
            raise HTTPException(status_code=400, detail="Invalid image format. Supported formats: png, jpg, jpeg, webp, svg")
        
        # Save path: static/custom_logo.jpg
        static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
        os.makedirs(static_dir, exist_ok=True)
        
        # Generate custom logo filename with extension
        filename = f"custom_logo{ext}"
        logo_path = os.path.join(static_dir, filename)
        
        # Save uploaded file
        with open(logo_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Update setting in DB
        relative_url = f"/static/{filename}"
        database.update_system_settings({"software_logo": relative_url})
        
        return {"success": True, "logo_url": relative_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
