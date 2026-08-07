from pydantic import BaseModel, field_validator
from typing import Optional, List, Any

def sanitize_phone_10_digits(val: Any) -> str:
    if not val:
        return ''
    digits = ''.join(filter(str.isdigit, str(val)))
    return digits[:10]


# --- Auth Schemas ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Patient"
    phone: Optional[str] = ""

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# --- Triage Schemas ---
class TriageRequest(BaseModel):
    symptoms: str
    age: Optional[int] = 30
    gender: Optional[str] = "Unspecified"
    severity_self_rating: Optional[int] = 3
    duration: Optional[str] = "1-3 days"
    medical_history: Optional[str] = "None"

class TriageResponse(BaseModel):
    triage_level: str
    urgency_score: int
    recommended_department_id: int
    recommended_department_name: str
    recommendation_reason: str
    priority_color: str
    recommended_doctors: List[dict]

# --- Booking Schemas ---
class BookingRequest(BaseModel):
    doctor_id: int
    appointment_date: str
    time_slot: str
    patient_name: str
    patient_age: int
    patient_gender: str
    patient_phone: str
    patient_email: str
    symptoms: str
    triage_level: Optional[str] = "Routine"
    urgency_score: Optional[int] = 1
    payment_method: Optional[str] = "UPI"
    booking_source: Optional[str] = "Manual"

class StatusUpdateRequest(BaseModel):
    status: str
    consultation_notes: Optional[str] = ""
    room_no: Optional[str] = "Room 101"

# --- Prescription Schemas ---
class MedicineItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str

class PrescriptionRequest(BaseModel):
    appointment_id: int
    diagnosis: str
    medicines: List[MedicineItem]
    advice: str
    next_visit: str

# --- Bed & Emergency Schemas ---
class BedUpdateRequest(BaseModel):
    status: str
    patient_name: Optional[str] = "N/A"

class EmergencyRequest(BaseModel):
    caller_name: str
    caller_phone: str
    location: str
    priority: Optional[str] = "CRITICAL - LEVEL 1"

class EmergencyStatusUpdate(BaseModel):
    status: str
    eta_minutes: Optional[int] = 5

# --- WhatsApp Simulator Schemas ---
class WhatsAppChatRequest(BaseModel):
    phone_number: str
    message: str

class WhatsAppChatResponse(BaseModel):
    reply: str
    phone_number: str
    step: str
    timestamp: str

# --- Patient Schemas ---
class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = ""
    blood_group: Optional[str] = "O+"
    allergies: Optional[str] = "None"
    insurance_provider: Optional[str] = ""
    medical_history: Optional[str] = ""

# --- Lab & Pharmacy Schemas ---
class LabBookingRequest(BaseModel):
    patient_name: str
    phone: str
    test_name: str
    date: str

class PharmacySaleRequest(BaseModel):
    patient_name: str
    items: List[dict] # [{item_id, qty}]

class PharmacyItemCreate(BaseModel):
    name: str
    category: str
    stock_qty: int
    unit_price: float
    manufacturer: Optional[str] = "Generic Pharma"
    expiry_date: Optional[str] = "2026-12-31"

# --- Payment Schemas ---
class PaymentRequest(BaseModel):
    invoice_id: str
    patient_name: str
    amount: float
    payment_method: str

