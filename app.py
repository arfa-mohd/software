import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import database
from routers import (
    auth, doctors, patients, appointments, triage,
    whatsapp, prescriptions, beds, emergency, lab,
    pharmacy, payments, analytics, super_admin
)

# Initialize Database Schema & Seed Data
database.init_db()

app = FastAPI(
    title="AuraCare AI - Enterprise AI Hospital Management SaaS",
    description="Production-ready multi-specialty AI Hospital Management & WhatsApp Appointment Booking Platform",
    version="3.0.0"
)

# Enable CORS for cross-origin integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# Include All Feature Routers
app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(triage.router)
app.include_router(whatsapp.router)
app.include_router(prescriptions.router)
app.include_router(beds.router)
app.include_router(emergency.router)
app.include_router(lab.router)
app.include_router(pharmacy.router)
app.include_router(payments.router)
app.include_router(analytics.router)
app.include_router(super_admin.router)

@app.post("/webhook")
@app.get("/webhook")
async def fallback_meta_webhook(request: Request):
    """Fallback Meta Webhook Handler"""
    if request.method == "GET":
        return whatsapp.verify_meta_webhook(
            mode=request.query_params.get("hub.mode"),
            token=request.query_params.get("hub.verify_token"),
            challenge=request.query_params.get("hub.challenge")
        )
    return await whatsapp.receive_meta_whatsapp_message(request)

# Mount Static Assets Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def read_root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AuraCare AI Platform Backend API Running v3.0.0"}

@app.exception_handler(404)
def custom_404_handler(request: Request, exc):
    index_file = os.path.join(STATIC_DIR, "index.html")
    if request.url.path.startswith("/api"):
        return JSONResponse({"detail": "API endpoint not found"}, status_code=404)
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"detail": "Not found"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
