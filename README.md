# AuraCare AI - Enterprise AI Hospital Management & Smart WhatsApp Platform

AuraCare AI is a multi-specialty AI Hospital Management & Smart WhatsApp Appointment Booking SaaS application. Built using Python 3.11 with FastAPI, SQLite, Pydantic, PyJWT, and a Deep Midnight Glassmorphism UI.

## Features

1. **Multilingual AI WhatsApp Assistant & Chat Simulator**:
   - Understands English, Tanglish, and Tamil queries (e.g., *"enaku fever 3 days ah iruku"*).
   - Automated 1️⃣-8️⃣ interactive menu navigation for booking appointments, Emergency SOS, Lab reports, Prescriptions, Doctor availability, OP timings, Payment status, and My Bookings.

2. **AI Symptom Triage & Risk Assessment**:
   - Calculates urgency priority colors: 🔴 Red (CRITICAL), 🟠 Orange (HIGH PRIORITY), 🟡 Yellow (MODERATE), 🟢 Green (ROUTINE).
   - Recommends appropriate medical departments & specialists based on clinical severity scoring.

3. **OPD Live Queue Board & Doctor Appointment Booking**:
   - Real-time status movement (Scheduled -> Waiting -> In Consultation -> Completed).
   - Consultation notes, room assignments, and patient call alerts.

4. **Real-Time ICU & Bed Occupancy Matrix**:
   - Live bed tracker across ICU, General Ward, VIP Suites with instant status toggle.

5. **Digital E-Prescription & Printable PDF Generator**:
   - Full prescription builder with medicine dosage, frequency, advice, and QR verification layout.

6. **24/7 Emergency SOS Dispatcher**:
   - High-priority ambulance dispatch timeline with GPS location tracker and ETA counter.

7. **Lab Diagnostics, Pharmacy & Billing Modules**:
   - Lab test booking & PDF report distribution.
   - Pharmacy medicine stock inventory with low-stock and expiry date alerts.
   - Payment transaction log with UPI, Card, Cash receipts.

8. **Executive Analytics Dashboard**:
   - Chart.js visualizations for monthly revenue growth and AI triage index.

## Running Locally

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Uvicorn FastAPI Server:
   ```bash
   python -m uvicorn app:app --port 8000 --reload
   ```

3. Open in Browser:
   ```
   http://localhost:8000
   ```
