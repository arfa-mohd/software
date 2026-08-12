import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hospital_local.db')
DATABASE_URL = os.getenv("DATABASE_URL")

class DictRowWrapper:
    def __init__(self, d):
        self._d = dict(d) if d else {}
    def __getitem__(self, key):
        return self._d.get(key)
    def get(self, key, default=None):
        return self._d.get(key, default)
    def keys(self):
        return self._d.keys()
    def __contains__(self, key):
        return key in self._d

class PgCursorAdapter:
    def __init__(self, pg_cursor):
        self.cursor = pg_cursor

    def execute(self, query, params=()):
        pg_query = query.replace('?', '%s').replace('AUTOINCREMENT', '')
        self.cursor.execute(pg_query, params)
        return self

    def fetchone(self):
        row = self.cursor.fetchone()
        return DictRowWrapper(row) if row else None

    def fetchall(self):
        rows = self.cursor.fetchall()
        return [DictRowWrapper(r) for r in rows] if rows else []

    @property
    def lastrowid(self):
        try:
            self.cursor.execute("SELECT LASTVAL()")
            res = self.cursor.fetchone()
            return list(res.values())[0] if res else None
        except Exception:
            return None

class PgConnAdapter:
    def __init__(self, pg_conn):
        self.conn = pg_conn

    def cursor(self):
        return PgCursorAdapter(self.conn.cursor())

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def execute(self, query, params=()):
        c = self.cursor()
        c.execute(query, params)
        return c

def get_db_connection():
    if DATABASE_URL:
        try:
            import psycopg2
            import psycopg2.extras
            db_url = DATABASE_URL.replace("postgres://", "postgresql://") if DATABASE_URL.startswith("postgres://") else DATABASE_URL
            raw_conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
            return PgConnAdapter(raw_conn)
        except Exception as e:
            print("PostgreSQL connection error, falling back to local SQLite:", e)
            conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            return conn
    else:
        conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table (Role Based Access)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL, -- Admin, Doctor, Receptionist, Lab, Pharmacy, Patient
        phone TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
    ''')

    # 2. Departments Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT NOT NULL,
        lead_doctor TEXT NOT NULL
    )
    ''')

    # 3. Doctors Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department_id INTEGER NOT NULL,
        department_name TEXT NOT NULL,
        title TEXT NOT NULL,
        specialty TEXT NOT NULL,
        experience INTEGER NOT NULL,
        rating REAL NOT NULL,
        reviews_count INTEGER NOT NULL,
        fee REAL NOT NULL,
        avatar_url TEXT NOT NULL,
        bio TEXT NOT NULL,
        languages TEXT DEFAULT 'English, Tamil, Hindi',
        status TEXT DEFAULT 'Online',
        FOREIGN KEY (department_id) REFERENCES departments (id)
    )
    ''')

    # 4. Doctor Schedules Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        is_booked INTEGER DEFAULT 0,
        FOREIGN KEY (doctor_id) REFERENCES doctors (id)
    )
    ''')

    # 5. Patients EMR Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT DEFAULT '',
        blood_group TEXT DEFAULT 'O+',
        allergies TEXT DEFAULT 'None',
        insurance_provider TEXT DEFAULT 'Star Health Insurance',
        policy_no TEXT DEFAULT 'SHI-908123',
        medical_history TEXT DEFAULT 'No chronic illnesses recorded.'
    )
    ''')

    # 6. Appointments Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_code TEXT UNIQUE NOT NULL,
        patient_name TEXT NOT NULL,
        patient_age INTEGER NOT NULL,
        patient_gender TEXT NOT NULL,
        patient_phone TEXT NOT NULL,
        patient_email TEXT NOT NULL,
        doctor_id INTEGER NOT NULL,
        doctor_name TEXT NOT NULL,
        department_name TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        triage_level TEXT NOT NULL,
        urgency_score INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Scheduled', -- Scheduled, Waiting, In Consultation, Completed, Cancelled
        created_at TEXT NOT NULL,
        consultation_notes TEXT DEFAULT '',
        payment_status TEXT DEFAULT 'Paid',
        payment_amount REAL NOT NULL,
        room_no TEXT DEFAULT 'Room 101',
        booking_source TEXT DEFAULT 'Manual', -- 'Manual' or 'WhatsApp'
        FOREIGN KEY (doctor_id) REFERENCES doctors (id)
    )
    ''')

    # Ensure booking_source column exists if table was already created
    try:
        cursor.execute("ALTER TABLE appointments ADD COLUMN booking_source TEXT DEFAULT 'Manual'")
    except Exception:
        pass

    # 7. Prescriptions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        booking_code TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        department_name TEXT NOT NULL,
        date TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        medicines_json TEXT NOT NULL,
        advice TEXT NOT NULL,
        next_visit TEXT NOT NULL,
        qr_hash TEXT DEFAULT '',
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
    )
    ''')

    # 8. Hospital Beds Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS beds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ward_name TEXT NOT NULL,
        bed_number TEXT NOT NULL,
        bed_type TEXT NOT NULL,
        status TEXT NOT NULL, -- Available, Occupied, Maintenance
        patient_name TEXT DEFAULT 'N/A',
        updated_at TEXT NOT NULL
    )
    ''')

    # 9. Emergency SOS Alerts Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS emergency_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_code TEXT UNIQUE NOT NULL,
        caller_name TEXT NOT NULL,
        caller_phone TEXT NOT NULL,
        location TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT DEFAULT 'Dispatched', -- Dispatched, En Route, Arrived at Scene, In Transit, ER Received
        assigned_ambulance TEXT NOT NULL,
        created_at TEXT NOT NULL,
        eta_minutes INTEGER DEFAULT 12
    )
    ''')

    # 10. WhatsApp Session Tracker
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        phone_number TEXT PRIMARY KEY,
        step TEXT NOT NULL DEFAULT 'IDLE',
        patient_name TEXT DEFAULT '',
        patient_age INTEGER DEFAULT 0,
        patient_gender TEXT DEFAULT '',
        symptoms TEXT DEFAULT '',
        doctor_id INTEGER DEFAULT 0,
        appointment_date TEXT DEFAULT '',
        time_slot TEXT DEFAULT '',
        triage_data TEXT DEFAULT '{}',
        updated_at TEXT NOT NULL
    )
    ''')

    # Ensure triage_data column exists if table was already created
    try:
        cursor.execute("ALTER TABLE whatsapp_sessions ADD COLUMN triage_data TEXT DEFAULT '{}'")
    except Exception:
        pass

    # 10b. Real WhatsApp Message History Log Table (Database Persistence)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        sender TEXT NOT NULL, -- 'patient' or 'bot'
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    ''')

    # 11. Lab Tests & Bookings
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS lab_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        turnaround_hours INTEGER NOT NULL,
        sample_type TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS lab_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_code TEXT UNIQUE NOT NULL,
        patient_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        test_name TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'Sample Collected', -- Requested, Sample Collected, Processing, Ready
        result_summary TEXT DEFAULT 'Pending Analysis',
        file_url TEXT DEFAULT ''
    )
    ''')

    # 12. Pharmacy Medicine Stock & Invoices
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pharmacy_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        stock_qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        expiry_date TEXT NOT NULL,
        batch_no TEXT NOT NULL,
        manufacturer TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pharmacy_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT UNIQUE NOT NULL,
        patient_name TEXT NOT NULL,
        date TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_status TEXT DEFAULT 'Paid',
        items_json TEXT NOT NULL
    )
    ''')

    # 13. Payment Records
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL, -- UPI, Credit Card, Debit Card, Cash, Insurance
        transaction_ref TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Completed',
        date TEXT NOT NULL
    )
    ''')

    conn.commit()

    # Seed initial data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)
        conn.commit()

    # 14. Super Admin Custom Pages Config Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS custom_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        icon TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0,
        columns_json TEXT DEFAULT '[]',
        is_visible INTEGER DEFAULT 1,
        table_name TEXT DEFAULT ''
    )
    ''')

    # Seed default modules if empty
    cursor.execute("SELECT COUNT(*) FROM custom_pages")
    if cursor.fetchone()[0] == 0:
        default_pages = [
            ('dashboard', 'Dashboard', 'Hospital Intelligence Overview', 'fas fa-th-large', 0, '[]', 1, ''),
            ('whatsapp', 'WhatsApp Patients', 'WhatsApp-Booked Patient Queue', 'fab fa-whatsapp', 0, '[]', 1, ''),
            ('queue', 'OPD Reservations', 'Live OPD Queue Board & Appointments', 'fas fa-calendar-alt', 0, '[]', 1, ''),
            ('prescriptions', 'E-Prescriptions', 'Digital Prescription Log', 'fas fa-file-prescription', 0, '[]', 1, ''),
            ('patients', 'Patient EMR', 'Electronic Medical Records', 'fas fa-users', 0, '[]', 1, ''),
            ('patient_docs', 'Patient Documents', 'Patient Document Cabinet & File Locker', 'fas fa-folder-open', 0, '[]', 1, ''),
            ('lab', 'Lab Diagnostics', 'Pathology & Diagnostic Reports', 'fas fa-flask', 0, '[]', 1, ''),
            ('pharmacy', 'Inventory Stock', 'Inventory & Dispensing Control', 'fas fa-pills', 0, '[]', 1, ''),
            ('payments', 'Financials', 'Revenue, Gateways & Financial Log', 'fas fa-wallet', 0, '[]', 1, ''),
            ('settings', 'System Settings', 'Customize Dashboard Design & Colors', 'fas fa-sliders-h', 0, '[]', 1, ''),
            ('pos_billing', 'POS Billing', 'Point of Sale Billing & Invoices', 'fas fa-receipt', 1, '["Patient Name", "Age", "Billing Item", "Amount", "Payment Method"]', 1, 'dyn_pos_billing')
        ]
        cursor.executemany(
            "INSERT INTO custom_pages (key, title, subtitle, icon, is_custom, columns_json, is_visible, table_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            default_pages
        )
        
        # Create physical table for POS Billing
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS dyn_pos_billing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            col_0 TEXT, -- Patient Name
            col_1 TEXT, -- Age
            col_2 TEXT, -- Billing Item
            col_3 TEXT, -- Amount
            col_4 TEXT  -- Payment Method
        )
        ''')
    # 15. System Settings Table (For branding/white-labeling)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
    )
    ''')

    # Seed default settings if empty
    cursor.execute("SELECT COUNT(*) FROM system_settings")
    if cursor.fetchone()[0] == 0:
        default_settings = [
            ('software_name', 'AuraCare Hospital'),
            ('software_logo', '/static/logo.jpg'),
            ('software_subtitle', 'Next-Gen Enterprise Health Intelligence Ecosystem')
        ]
        cursor.executemany(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            default_settings
        )

    # 16. Patient Folders Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS patient_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 17. Patient Documents Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS patient_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES patient_folders(id) ON DELETE CASCADE
    )
    ''')

    # Ensure faid, niyamath, 6379558054 are always present in the database on startup
    ensure_featured_patients_exist(cursor)

    conn.commit()
    conn.close()

def ensure_featured_patients_exist(cursor):
    today = datetime.now()
    now_str = today.strftime("%Y-%m-%d %H:%M:%S")
    today_date = today.strftime("%Y-%m-%d")

    # Required patient records
    target_patients = [
        ("faid", 28, "Male", "6385634565", "faid@example.com", "O+", "None", "Star Health Insurance", "SHI-883921", "OPD & WhatsApp Patient."),
        ("niyamath", 31, "Male", "7397065324", "niyamath@example.com", "A+", "Dust Allergy", "HDFC ERGO Health", "HDF-992012", "OPD Consultation."),
        ("Primary Client (Test)", 30, "Male", "6379558054", "test.primary@example.com", "O+", "None", "Star Health", "SHI-000001", "Featured Test Client.")
    ]

    for p in target_patients:
        try:
            cursor.execute("SELECT id FROM patients WHERE phone = ?", (p[3],))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO patients (name, age, gender, phone, email, blood_group, allergies, insurance_provider, policy_no, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    p
                )
        except Exception as e:
            print(f"Error seeding patient {p[0]}:", e)

    # Required appointment records
    target_appts = [
        ("AURA-1001", "faid", 28, "Male", "6385634565", "faid@example.com", 1, "Dr. Rajesh Kumar", "Cardiology",
         today_date, "10:00 AM", "General Health Checkup & OPD Consultation", "ROUTINE", 1,
         "Scheduled", now_str, "Routine health checkup scheduled.", "Paid", 1500.00, "Room 101", "WhatsApp"),

        ("AURA-1002", "niyamath", 31, "Male", "7397065324", "niyamath@example.com", 7, "Dr. James Wilson", "General Medicine",
         today_date, "11:30 AM", "General OPD Consultation", "ROUTINE", 1,
         "Scheduled", now_str, "OPD Reservation.", "Paid", 800.00, "Room 102", "OPD Reservation"),

        ("AURA-1003", "Primary Client (Test)", 30, "Male", "6379558054", "test.primary@example.com", 1, "Dr. Rajesh Kumar", "Cardiology",
         today_date, "01:00 PM", "Priority Test Consultation", "ROUTINE", 1,
         "Scheduled", now_str, "Primary Test Client.", "Paid", 1500.00, "Room 103", "Featured Test")
    ]

    for a in target_appts:
        try:
            cursor.execute("SELECT id FROM appointments WHERE patient_phone = ? OR booking_code = ?", (a[4], a[0]))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO appointments (booking_code, patient_name, patient_age, patient_gender, patient_phone, patient_email, doctor_id, doctor_name, department_name, appointment_date, time_slot, symptoms, triage_level, urgency_score, status, created_at, consultation_notes, payment_status, payment_amount, room_no, booking_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    a
                )
        except Exception as e:
            print(f"Error seeding appt {a[1]}:", e)

def seed_data(cursor):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    now_time = datetime.now().strftime("%I:%M %p")
    
    # 1. Seed Users (Demo Login Credentials for RBAC)
    users = [
        ("admin@auracare.ai", hash_password("admin123"), "Dr. Rajesh Kumar (Medical Director)", "Admin", "9876543210", now_str),
        ("doctor@auracare.ai", hash_password("doctor123"), "Dr. Rajesh Kumar", "Doctor", "9876543211", now_str),
        ("reception@auracare.ai", hash_password("reception123"), "Priya Sharma (Chief Receptionist)", "Receptionist", "9876543212", now_str),
        ("lab@auracare.ai", hash_password("lab123"), "Karthik Subramanian (Lab Head)", "Lab", "9876543213", now_str),
        ("pharmacy@auracare.ai", hash_password("pharmacy123"), "Anitha Ramesh (PharmD)", "Pharmacy", "9876543214", now_str),
        ("patient@auracare.ai", hash_password("patient123"), "David Miller", "Patient", "9876543215", now_str)
    ]
    cursor.executemany(
        "INSERT INTO users (email, password_hash, full_name, role, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        users
    )

    # 2. Seed Departments
    departments = [
        ("Cardiology", "fa-heart-pulse", "Advanced Heart Care & Cardiac Surgery", "Dr. Rajesh Kumar"),
        ("Neurology", "fa-brain", "Brain, Spine & Nervous System Center", "Dr. Elena Rostova"),
        ("Orthopedics", "fa-bone", "Joint Replacement & Trauma Care", "Dr. Marcus Thorne"),
        ("Dermatology", "fa-user-nurse", "Skin Health & Cosmetic Dermatology", "Dr. Sophia Lin"),
        ("Pediatrics", "fa-child", "Child Care & Pediatric Surgery", "Dr. David Miller"),
        ("Oncology", "fa-dna", "Cancer Care & Immunotherapy", "Dr. Rachel Adams"),
        ("General Medicine", "fa-stethoscope", "Comprehensive Diagnostic & Primary Care", "Dr. James Wilson"),
        ("Emergency & Trauma", "fa-kit-medical", "24/7 Critical Emergency Unit", "Dr. Sarah Connor")
    ]
    cursor.executemany(
        "INSERT INTO departments (name, icon, description, lead_doctor) VALUES (?, ?, ?, ?)",
        departments
    )

    # 3. Seed Doctors
    doctors = [
        ("Dr. Rajesh Kumar", 1, "Cardiology", "Chief Cardiologist", "Interventional Cardiology", 18, 4.9, 320, 1500.00,
         "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
         "Senior Cardiologist specializing in coronary angioplasty, heart failure management, and preventive cardiology.", "English, Tamil, Hindi", "Online"),
        
        ("Dr. Elena Rostova", 2, "Neurology", "Senior Neurosurgeon", "Brain Tumors & Spine Surgery", 15, 4.95, 210, 1800.00,
         "https://images.unsplash.com/photo-1594824813566-88855ce7896c?auto=format&fit=crop&w=400&q=80",
         "Renowned neurosurgeon with expertise in minimally invasive spine surgery and stroke recovery treatment.", "English, Tamil, French", "Online"),
        
        ("Dr. Marcus Thorne", 3, "Orthopedics", "Consultant Orthopedist", "Joint Replacement & Sports Injury", 14, 4.8, 185, 1400.00,
         "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
         "Pioneer in robotic knee replacement and arthroscopic shoulder reconstructions.", "English, Tamil", "Online"),
        
        ("Dr. Sophia Lin", 4, "Dermatology", "Lead Dermatologist", "Cosmetic & Laser Skin Therapy", 10, 4.85, 240, 1200.00,
         "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
         "Expert in clinical dermatology, acne treatments, skin cancer screening, and aesthetic rejuvenation.", "English, Tanglish, Hindi", "Online"),
        
        ("Dr. David Miller", 5, "Pediatrics", "Senior Pediatrician", "Child Development & Immunization", 12, 4.9, 195, 1100.00,
         "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
         "Compassionate pediatrician dedicated to newborn care, adolescent health, and pediatric nutrition.", "English, Tamil", "Online"),
        
        ("Dr. Rachel Adams", 6, "Oncology", "Senior Oncologist", "Immunotherapy & Precision Oncology", 16, 4.92, 130, 2000.00,
         "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
         "Leading specialist in personalized cancer vaccines, targeted therapies, and early detection.", "English, Tamil, German", "Online"),
        
        ("Dr. James Wilson", 7, "General Medicine", "Chief Physician", "Internal Medicine & Diabetes", 20, 4.88, 410, 800.00,
         "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
         "Master clinician providing holistic disease prevention, lifestyle medicine, and multi-system diagnostics.", "English, Tamil, Tanglish, Hindi", "Online"),

        ("Dr. Sarah Connor", 8, "Emergency & Trauma", "Trauma Specialist", "Critical Care & Resuscitation", 11, 4.94, 290, 1600.00,
         "https://images.unsplash.com/photo-1594824813566-88855ce7896c?auto=format&fit=crop&w=400&q=80",
         "Emergency medicine expert specializing in acute trauma resuscitation and cardiac arrest intervention.", "English, Tamil", "Online")
    ]
    cursor.executemany(
        '''INSERT INTO doctors 
        (name, department_id, department_name, title, specialty, experience, rating, reviews_count, fee, avatar_url, bio, languages, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        doctors
    )

    # 4. Seed Doctor Schedules
    today = datetime.now()
    time_slots = ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"]

    schedules = []
    for doc_id in range(1, len(doctors) + 1):
        for day_offset in range(0, 7):
            slot_date = (today + timedelta(days=day_offset)).strftime("%Y-%m-%d")
            for idx, slot in enumerate(time_slots):
                is_booked = 1 if (doc_id + day_offset + idx) % 4 == 0 else 0
                schedules.append((doc_id, slot_date, slot, is_booked))
    
    cursor.executemany(
        "INSERT INTO schedules (doctor_id, date, time_slot, is_booked) VALUES (?, ?, ?, ?)",
        schedules
    )

    # 5. Seed Patients EMR Data
    patients = [
      ("faid", 28, "Male", "6385634565", "faid@example.com", "O+", "None", "Star Health Insurance", "SHI-883921", "OPD & WhatsApp Patient."),
      ("niyamath", 31, "Male", "7397065324", "niyamath@example.com", "A+", "Dust Allergy", "HDFC ERGO Health", "HDF-992012", "OPD Consultation."),
      ("Primary Client (Test)", 30, "Male", "6379558054", "test.primary@example.com", "O+", "None", "Star Health", "SHI-000001", "Featured Test Client."),
      ("David Miller", 42, "Male", "9876543215", "david.m@example.com", "O+", "Penicillin", "Star Health Insurance", "SHI-908123", "Mild hypertension managed with Metoprolol."),
      ("Samantha Reed", 29, "Female", "9876587654", "sam.reed@example.com", "A+", "Dust / Pollen", "HDFC ERGO Health", "HDF-441029", "No chronic conditions."),
      ("Arthur Pendelton", 61, "Male", "9876599122", "arthur.p@example.com", "B+", "Sulfa Drugs", "Care Health Insurance", "CHI-102938", "Type 2 Diabetes mellitus under medication.")
    ]
    cursor.executemany(
        '''INSERT INTO patients 
        (name, age, gender, phone, email, blood_group, allergies, insurance_provider, policy_no, medical_history) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        patients
    )



    # 6. Seed Appointments
    appointments = [
        ("AURA-1001", "faid", 28, "Male", "6385634565", "faid@example.com", 1, "Dr. Rajesh Kumar", "Cardiology",
         today.strftime("%Y-%m-%d"), "10:00 AM", "General Consultation & Health Checkup", "ROUTINE", 1,
         "Scheduled", today.strftime("%Y-%m-%d %H:%M"), "Routine health checkup scheduled.", "Paid", 1500.00, "Room 101", "WhatsApp"),

        ("AURA-1002", "niyamath", 31, "Male", "7397065324", "niyamath@example.com", 7, "Dr. James Wilson", "General Medicine",
         today.strftime("%Y-%m-%d"), "11:30 AM", "General OPD Consultation", "ROUTINE", 1,
         "Scheduled", today.strftime("%Y-%m-%d %H:%M"), "OPD Reservation.", "Paid", 800.00, "Room 102", "OPD Reservation"),

        ("AURA-1003", "Primary Client (Test)", 30, "Male", "6379558054", "test.primary@example.com", 1, "Dr. Rajesh Kumar", "Cardiology",
         today.strftime("%Y-%m-%d"), "01:00 PM", "Priority Test Consultation", "ROUTINE", 1,
         "Scheduled", today.strftime("%Y-%m-%d %H:%M"), "Primary Test Client.", "Paid", 1500.00, "Room 103", "Featured Test"),

        ("AURA-8821", "David Miller", 42, "Male", "9876543215", "david.m@example.com", 1, "Dr. Rajesh Kumar", "Cardiology",
         today.strftime("%Y-%m-%d"), "10:00 AM", "Tightness in chest, shortness of breath on exertion.", "HIGH PRIORITY", 3,
         "Completed", today.strftime("%Y-%m-%d %H:%M"), "ECG performed. Mild sinus tachycardia. Prescribed Beta-Blocker and advised rest.",
         "Paid", 1500.00, "Room 304", "WhatsApp"),

        ("AURA-9412", "Samantha Reed", 29, "Female", "9876587654", "sam.reed@example.com", 4, "Dr. Sophia Lin", "Dermatology",
         today.strftime("%Y-%m-%d"), "02:00 PM", "Persistent skin rash and itching on arms.", "ROUTINE", 1,
         "Scheduled", today.strftime("%Y-%m-%d %H:%M"), "", "Paid", 1200.00, "Room 201", "Manual"),

        ("AURA-7305", "Arthur Pendelton", 61, "Male", "9876599122", "arthur.p@example.com", 2, "Dr. Elena Rostova", "Neurology",
         today.strftime("%Y-%m-%d"), "03:30 PM", "Frequent tension headaches and severe dizziness.", "MODERATE", 2,
         "In Consultation", today.strftime("%Y-%m-%d %H:%M"), "MRI scan ordered. Patient under active evaluation.", "Paid", 1800.00, "Room 402", "Manual")
    ]

    cursor.executemany(
        '''INSERT INTO appointments 
        (booking_code, patient_name, patient_age, patient_gender, patient_phone, patient_email, doctor_id, doctor_name, department_name, appointment_date, time_slot, symptoms, triage_level, urgency_score, status, created_at, consultation_notes, payment_status, payment_amount, room_no, booking_source) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        appointments
    )

    # 6b. Seed Real WhatsApp Message Log Threads in DB
    wa_msgs = [
        ("6385634565", "faid", "patient", "Hello, appointment confirmation for health checkup", "08:30 AM"),
        ("6385634565", "faid", "bot", "🏥 Welcome faid! Your health checkup is confirmed with Dr. Rajesh Kumar.", "08:31 AM"),
        ("7397065324", "niyamath", "patient", "Hi OPD appointment required", "09:10 AM"),
        ("7397065324", "niyamath", "bot", "🏥 Welcome niyamath! Your OPD consultation is confirmed.", "09:11 AM"),
        ("9876543215", "David Miller", "patient", "enaku fever 3 days ah iruku", "08:58 AM"),
        ("9876543215", "David Miller", "bot", "🏥 *Welcome to AuraCare AI Health Assistant!*\nBased on your symptoms ('enaku fever 3 days ah iruku'), I recommend General Medicine (Dr. James Wilson).\nWould you like me to book an appointment tomorrow at 10:00 AM? Reply 'YES' to confirm.", "08:59 AM"),
        ("9876543215", "David Miller", "patient", "YES", "09:00 AM"),
        ("9876543215", "David Miller", "bot", "🎉 *APPOINTMENT CONFIRMED!*\n🎫 Booking Reference: `AURA-8821`\n👤 Patient: David Miller\n👨‍⚕️ Doctor: Dr. Rajesh Kumar (Cardiology)\n📅 Date: Today at 10:00 AM", "09:00 AM"),

        ("9876587654", "Samantha Reed", "patient", "Hi, I need skin allergy appointment", "09:15 AM"),
        ("9876587654", "Samantha Reed", "bot", "💡 Recommended Department: Dermatology (Dr. Sophia Lin).\nAvailable Slot: Today at 02:00 PM. Consultation Fee: ₹1,200.", "09:16 AM"),

        ("9876599122", "Arthur Pendelton", "patient", "3", "09:30 AM"),
        ("9876599122", "Arthur Pendelton", "bot", "🧪 *Lab Diagnostics Status*\n📄 Patient: Arthur Pendelton\n🔬 Test: Fasting Blood Sugar & HbA1c\n✅ Status: Ready & Verified", "09:31 AM")
    ]
    cursor.executemany(
        "INSERT INTO whatsapp_messages (phone_number, patient_name, sender, message, timestamp) VALUES (?, ?, ?, ?, ?)",
        wa_msgs
    )

    # 7. Seed Prescriptions
    meds = json.dumps([
        {"name": "Metoprolol Succinate 25mg", "dosage": "1 Tablet", "frequency": "Once Daily (Morning)", "duration": "14 Days"},
        {"name": "Aspirin 81mg (Low Dose)", "dosage": "1 Tablet", "frequency": "Once Daily (After Lunch)", "duration": "30 Days"}
    ])
    cursor.execute(
        '''INSERT INTO prescriptions 
        (appointment_id, booking_code, patient_name, doctor_name, department_name, date, diagnosis, medicines_json, advice, next_visit, qr_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (1, "AURA-8821", "David Miller", "Dr. Rajesh Kumar", "Cardiology", today.strftime("%Y-%m-%d"),
         "Mild Sinus Tachycardia & Exertional Dyspnea", meds,
         "Avoid strenuous workouts for 1 week. Maintain low sodium diet. Monitor BP twice daily.",
         (today + timedelta(days=14)).strftime("%Y-%m-%d"), "QR-AURA-8821-VERIFIED")
    )

    # 8. Seed Hospital Beds
    beds = [
        ("ICU Ward", "ICU-01", "Ventilator Support", "Occupied", "Michael Vance", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("ICU Ward", "ICU-02", "Ventilator Support", "Available", "N/A", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("ICU Ward", "ICU-03", "Cardiac Monitor", "Occupied", "Sonia Patel", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("VIP Deluxe", "VIP-101", "Private Suite", "Occupied", "Robert Downey", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("VIP Deluxe", "VIP-102", "Private Suite", "Available", "N/A", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("General Ward A", "GEN-A1", "Standard Bed", "Occupied", "John Smith", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("General Ward A", "GEN-A2", "Standard Bed", "Occupied", "Emma Watson", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("General Ward A", "GEN-A3", "Standard Bed", "Available", "N/A", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("General Ward B", "GEN-B1", "Oxygen Assisted", "Occupied", "Carlos Mendez", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("General Ward B", "GEN-B2", "Oxygen Assisted", "Available", "N/A", datetime.now().strftime("%Y-%m-%d %H:%M")),
    ]
    cursor.executemany(
        "INSERT INTO beds (ward_name, bed_number, bed_type, status, patient_name, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        beds
    )

    # 9. Seed Emergency Alerts
    cursor.execute(
        '''INSERT INTO emergency_alerts 
        (alert_code, caller_name, caller_phone, location, priority, status, assigned_ambulance, created_at, eta_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        ("SOS-901", "Emergency Helpline", "9876591100", "742 Anna Salai, Sector 4, Chennai", "CRITICAL - LEVEL 1",
         "Dispatched", "Ambulance Unit Alpha-03", datetime.now().strftime("%Y-%m-%d %H:%M"), 8)
    )

    # 10. Seed Lab Tests
    lab_tests = [
        ("Complete Blood Count (CBC)", "Hematology", 450.00, 6, "Blood Sample"),
        ("Lipid Profile (Cholesterol)", "Biochemistry", 850.00, 12, "Fasting Blood"),
        ("HbA1c (Diabetes Index)", "Endocrinology", 600.00, 8, "Blood Sample"),
        ("Chest X-Ray Digital", "Radiology", 750.00, 2, "Imaging"),
        ("Brain MRI Scan with Contrast", "Radiology", 6500.00, 24, "Imaging"),
        ("RT-PCR Viral Panel", "Microbiology", 1200.00, 12, "Nasal Swab")
    ]
    cursor.executemany(
        "INSERT INTO lab_tests (test_name, category, price, turnaround_hours, sample_type) VALUES (?, ?, ?, ?, ?)",
        lab_tests
    )

    cursor.execute(
        '''INSERT INTO lab_bookings
        (booking_code, patient_name, phone, test_name, date, status, result_summary, file_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        ("LAB-701", "David Miller", "9876543215", "Complete Blood Count (CBC)", today.strftime("%Y-%m-%d"),
         "Ready", "Hemoglobin 14.2 g/dL, WBC Count 7,200/mcL - Normal Range", "/static/reports/cbc_david_miller.pdf")
    )

    # 11. Seed Pharmacy Stock
    pharmacy_items = [
        ("Metoprolol 25mg", "Cardiovascular", 150, 45.00, "2027-12-31", "B-9081", "Sun Pharma"),
        ("Amoxicillin 500mg", "Antibiotics", 300, 65.00, "2027-08-15", "B-4412", "Cipla Ltd"),
        ("Paracetamol 650mg (Dolo)", "Analgesics", 800, 15.00, "2028-01-20", "B-1120", "Micro Labs"),
        ("Atorvastatin 10mg", "Statins", 220, 85.00, "2027-10-10", "B-6671", "Dr. Reddy's"),
        ("Pantoprazole 40mg", "Antacids", 410, 35.00, "2027-11-25", "B-3349", "Zydus Healthcare")
    ]
    cursor.executemany(
        "INSERT INTO pharmacy_items (name, category, stock_qty, unit_price, expiry_date, batch_no, manufacturer) VALUES (?, ?, ?, ?, ?, ?, ?)",
        pharmacy_items
    )

    cursor.execute(
        '''INSERT INTO pharmacy_invoices (invoice_no, patient_name, date, total_amount, payment_status, items_json)
        VALUES (?, ?, ?, ?, ?, ?)''',
        ("INV-5501", "David Miller", today.strftime("%Y-%m-%d"), 125.00, "Paid", meds)
    )

    # 12. Seed Payment Transaction Records
    seed_payments = [
        ("INV-5501", "David Miller", 1500.00, "UPI / Google Pay", "TXN-908123987", "Completed", today.strftime("%Y-%m-%d 10:14")),
        ("INV-5502", "Rajesh Kumar", 2800.00, "HDFC Credit Card", "TXN-881920394", "Completed", today.strftime("%Y-%m-%d 11:30")),
        ("INV-5503", "Priya Sharma", 850.00, "Cash Counter 1", "TXN-773821092", "Completed", today.strftime("%Y-%m-%d 12:05")),
        ("INV-5504", "Anitha Ramesh", 4500.00, "Razorpay UPI", "TXN-661982341", "Completed", today.strftime("%Y-%m-%d 13:45")),
        ("INV-5505", "Vikram Singh", 12000.00, "Net Banking (ICICI)", "TXN-554910283", "Completed", today.strftime("%Y-%m-%d 14:20")),
        ("INV-5506", "Kavitha Nair", 1200.00, "PhonePe UPI", "TXN-442981029", "Pending", today.strftime("%Y-%m-%d 15:10")),
        ("INV-5507", "Suresh Menon", 3200.00, "Visa Debit Card", "TXN-331092847", "Completed", today.strftime("%Y-%m-%d 15:55"))
    ]
    cursor.executemany(
        '''INSERT INTO payments (invoice_id, patient_name, amount, payment_method, transaction_ref, status, date)
        VALUES (?, ?, ?, ?, ?, ?, ?)''',
        seed_payments
    )



# --- WhatsApp Session & Message Persistence DB Helpers ---
def get_whatsapp_session(phone_number: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM whatsapp_sessions WHERE phone_number = ?", (phone_number,))
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        if "triage_data" in data and data["triage_data"]:
            try:
                data["triage_data"] = json.loads(data["triage_data"])
            except Exception:
                data["triage_data"] = {}
        else:
            data["triage_data"] = {}
        return data
    return {"phone_number": phone_number, "step": "IDLE", "patient_name": "", "patient_age": 0, "patient_gender": "", "symptoms": "", "triage_data": {}}

def save_whatsapp_session(phone_number: str, step: str, patient_name: str = "", patient_age: int = 0, patient_gender: str = "", symptoms: str = "", triage_data: dict = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    triage_json = json.dumps(triage_data) if triage_data else "{}"
    cursor.execute('''
        INSERT INTO whatsapp_sessions (phone_number, step, patient_name, patient_age, patient_gender, symptoms, triage_data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone_number) DO UPDATE SET
            step = excluded.step,
            patient_name = excluded.patient_name,
            patient_age = excluded.patient_age,
            patient_gender = excluded.patient_gender,
            symptoms = excluded.symptoms,
            triage_data = excluded.triage_data,
            updated_at = excluded.updated_at
    ''', (phone_number, step, patient_name, patient_age, patient_gender, symptoms, triage_json, now_str))
    conn.commit()
    conn.close()

def save_whatsapp_message(phone_number: str, patient_name: str, sender: str, message: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    time_str = datetime.now().strftime("%I:%M %p")
    cursor.execute('''
        INSERT INTO whatsapp_messages (phone_number, patient_name, sender, message, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (phone_number, patient_name, sender, message, time_str))
    conn.commit()
    conn.close()

def get_whatsapp_messages(phone_number: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM whatsapp_messages WHERE phone_number = ? ORDER BY id ASC", (phone_number,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_whatsapp_chats():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT phone_number, patient_name, message as last_message, timestamp 
        FROM whatsapp_messages 
        WHERE id IN (SELECT MAX(id) FROM whatsapp_messages GROUP BY phone_number)
        ORDER BY id DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_today_whatsapp_messages():
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT * FROM whatsapp_messages WHERE timestamp LIKE ? ORDER BY id DESC", (f"{today_str}%",))
    rows = cursor.fetchall()
    if not rows:
        cursor.execute("SELECT * FROM whatsapp_messages ORDER BY id DESC LIMIT 6")
        rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_whatsapp_session(phone_number: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM whatsapp_sessions WHERE phone_number = ?", (phone_number,))
    conn.commit()
    conn.close()

# --- Super Admin DB Helpers ---
def get_custom_pages():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM custom_pages ORDER BY is_custom ASC, id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_custom_page_by_key(key: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM custom_pages WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_custom_page(key: str, title: str, subtitle: str, icon: str, columns: list):
    conn = get_db_connection()
    cursor = conn.cursor()
    table_name = f"dyn_{key}"
    columns_json = json.dumps(columns)
    
    try:
        # Register custom page
        cursor.execute(
            "INSERT INTO custom_pages (key, title, subtitle, icon, is_custom, columns_json, is_visible, table_name) VALUES (?, ?, ?, ?, 1, ?, 1, ?)",
            (key, title, subtitle, icon, columns_json, table_name)
        )
        
        # Dynamically build and execute CREATE TABLE for SQLite
        col_definitions = ", ".join([f"col_{i} TEXT" for i in range(len(columns))])
        create_sql = f"CREATE TABLE IF NOT EXISTS {table_name} (id INTEGER PRIMARY KEY AUTOINCREMENT, {col_definitions})"
        cursor.execute(create_sql)
        
        conn.commit()
        success = True
    except Exception as e:
        print(f"Error creating custom page: {e}")
        conn.rollback()
        success = False
        
    conn.close()
    return success

def update_page_visibility_and_name(key: str, is_visible: int, title: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cursor.execute(
            "UPDATE custom_pages SET is_visible = ?, title = ? WHERE key = ?",
            (is_visible, title, key)
        )
        conn.commit()
        success = True
    except Exception as e:
        print(f"Error updating page {key}: {e}")
        conn.rollback()
    conn.close()
    return success

def delete_custom_page(key: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cursor.execute("SELECT table_name FROM custom_pages WHERE key = ? AND is_custom = 1", (key,))
        row = cursor.fetchone()
        if row:
            table_name = row['table_name']
            # Drop the table
            cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
            # Delete from registry
            cursor.execute("DELETE FROM custom_pages WHERE key = ?", (key,))
            conn.commit()
            success = True
    except Exception as e:
        print(f"Error deleting custom page {key}: {e}")
        conn.rollback()
    conn.close()
    return success

# --- Dynamic Tables CRUD Helpers ---
def get_dynamic_table_data(table_name: str):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = []
    try:
        cursor.execute(f"SELECT * FROM {table_name} ORDER BY id DESC")
        rows = cursor.fetchall()
    except Exception as e:
        print(f"Error fetching dynamic data from {table_name}: {e}")
    conn.close()
    return [dict(r) for r in rows]

def add_dynamic_table_data(table_name: str, data: dict):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cols = [k for k in data.keys() if k.startswith("col_")]
        vals = [data[k] for k in cols]
        if cols:
            placeholders = ", ".join(["?"] * len(cols))
            columns_str = ", ".join(cols)
            cursor.execute(f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})", vals)
            conn.commit()
            success = True
    except Exception as e:
        print(f"Error inserting dynamic data into {table_name}: {e}")
        conn.rollback()
    conn.close()
    return success

def update_dynamic_table_data(table_name: str, row_id: int, data: dict):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cols = [k for k in data.keys() if k.startswith("col_")]
        sets = ", ".join([f"{k} = ?" for k in cols])
        vals = [data[k] for k in cols] + [row_id]
        if cols:
            cursor.execute(f"UPDATE {table_name} SET {sets} WHERE id = ?", vals)
            conn.commit()
            success = True
    except Exception as e:
        print(f"Error updating dynamic data in {table_name}: {e}")
        conn.rollback()
    conn.close()
    return success

def delete_dynamic_table_data(table_name: str, row_id: int):
    if not table_name.startswith("dyn_") or not table_name.isidentifier():
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cursor.execute(f"DELETE FROM {table_name} WHERE id = ?", (row_id,))
        conn.commit()
        success = True
    except Exception as e:
        print(f"Error deleting dynamic data from {table_name}: {e}")
        conn.rollback()
    conn.close()
    return success


def get_system_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM system_settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

def update_system_settings(settings: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        for k, v in settings.items():
            cursor.execute(
                "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (k, v)
            )
        conn.commit()
        success = True
    except Exception as e:
        print(f"Error updating system settings: {e}")
        conn.rollback()
    conn.close()
    return success


if __name__ == "__main__":
    init_db()
    print("Database initialized & pre-seeded successfully!")
