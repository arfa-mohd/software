import re
from datetime import datetime, timedelta
import crud
import database

# Language detection and response mapping
def detect_language(text: str) -> str:
    """Detect if text is Tamil, Tanglish, or English"""
    # Tamil Unicode range: \u0B80-\u0BFF
    tamil_pattern = re.compile(r'[\u0B80-\u0BFF]')
    if tamil_pattern.search(text):
        return 'tamil'
    
    # Tanglish patterns (common Tamil words written in English)
    tanglish_keywords = ['vanakkam', 'epdi', 'iruku', 'illai', 'aama', 'illa', 'sari', 'nalla', 'romba', 
                        'konjam', 'mikka', 'nanri', 'ungal', 'enakku', 'unga', 'pa', 'da', 'di', 'ga',
                        'thala', 'vali', 'sali', 'irumal', 'vaiiru', 'kulandhai', 'kai', 'kaal', 'moochu']
    words = text.lower().split()
    tanglish_count = sum(1 for word in words if word in tanglish_keywords)
    if tanglish_count > 0 and len(words) > 0:
        return 'tanglish'
    
    return 'english'

def get_response_in_language(language: str, response_key: str, **kwargs) -> str:
    """Get response in the appropriate language"""
    responses = {
        'welcome': {
            'tamil': """🏥 *ஆரா்கேர் AI மருத்துவமனைக்கு வரவேற்கிறோம்!*

வணக்கம்! நான் உங்கள் 24/7 AI ஹெல்த் அசிஸ்டெண்ட். உங்களுக்கு எப்படி உதவ முடியும்?

1️⃣ *டாக்டர் அப்பாயிண்ட்மெண்ட் புக் செய்ய*
2️⃣ *அவசர ஆம்புலன்ஸ் சேவை*
3️⃣ *லேப் ரிக்கோர்ட் பார்க்க*
4️⃣ *மருந்து சீட்டு பதிவிறக்க*
5️⃣ *டாக்டர்கள் விபரம் & கட்டணம்*
6️⃣ *மருத்துவமனை நேரம் & தொடர்பு*
7️⃣ *பில் & கட்டண விபரம்*
8️⃣ *என் அப்பாயிண்ட்மெண்ட்கள்*

👉 *1-8 எண்களை அழுத்தவும்* அல்லது உங்கள் உடல்நல பிரச்சனையை டைப் செய்யவும்.""",
            
            'tanglish': """🏥 *AuraCare AI Hospitalku Vanakkam!*

Vanakkam! Naan ungal 24/7 AI Health Assistant. Ungalukku epdi help pannalam?

1️⃣ *Doctor Appointment Book Panna*
2️⃣ *Emergency Ambulance Service*
3️⃣ *Lab Reports Parkka*
4️⃣ *E-Prescription Download Panna*
5️⃣ *Doctor Details & Fees*
6️⃣ *Hospital Timings & Contact*
7️⃣ *Payment & Billing Status*
8️⃣ *My Active Appointments*

👉 *1-8 number ah press pannunga* illa unga health problem ah type pannunga.""",
            
            'english': """🏥 *Welcome to AuraCare AI Hospital!*

Hello! I am your 24/7 AI Health Companion. How may I assist you today?

1️⃣ *Book Doctor Appointment*
2️⃣ *Emergency SOS Ambulance*
3️⃣ *View Lab Reports*
4️⃣ *Download E-Prescription*
5️⃣ *Doctor Availability & Fees*
6️⃣ *Hospital Timings & Contact*
7️⃣ *Payment & Billing Status*
8️⃣ *My Active Appointments*

👉 *Reply with a number (1-8)* or describe your symptoms."""
        },
        
        'ask_name': {
            'tamil': "📝 *படி 1/3: நோயாளி விபரம்*\n\nதயவுசெய்து நோயாளியின் **முழு பெயரை** டைப் செய்து அனுப்பவும்:",
            'tanglish': "📝 *Step 1/3: Patient Details*\n\nPlease reply with the **Patient's Full Name** ah type pannunga:",
            'english': "📝 *Step 1/3: Patient Details*\n\nPlease reply with the **Patient's Full Name**:"
        },
        
        'ask_age': {
            'tamil': "📝 *படி 2/3:* நோயாளியின் **வயதை** டைப் செய்யவும் (எ.கா. 32):",
            'tanglish': "📝 *Step 2/3:* Patient **Age** ah type pannunga (e.g. 32):",
            'english': "📝 *Step 2/3:* Please enter the patient's **Age** (e.g. 32):"
        },
        
        'ask_symptoms': {
            'tamil': "📝 *படி 3/3:* உங்கள் **அறிகுறிகளை** டைப் செய்யவும் (எ.கா. '3 நாளா தலைவலி இருக்கு'):",
            'tanglish': "📝 *Step 3/3:* Unga **Symptoms** ah type pannunga (e.g. '3 naala thala vali iruku'):",
            'english': "📝 *Step 3/3:* Please briefly describe your **Symptoms** (e.g. 'fever for 3 days'):"
        },
        
        'confirm_booking': {
            'tamil': "\n\nஇந்த அப்பாயிண்ட்மெண்டை உறுதி செய்யலாமா?\n👉 **'ஆமா'** அல்லது **'இல்லை'** என்று டைப் செய்யவும்!",
            'tanglish': "\n\nIndha appointment ah confirm pannalama?\n👉 **'AAMA'** illa **'ILLA'** nu type pannunga!",
            'english': "\n\nWould you like to confirm this booking?\n👉 Reply **'YES'** or **'NO'**!"
        }
    }
    
    if response_key in responses:
        return responses[response_key].get(language, responses[response_key]['english'])
    return ""

def find_available_slot(doctor_id: int, start_date: str, patient_type: str):
    """
    Finds the first available slot starting from start_date.
    If full, it automatically checks subsequent dates.
    Returns: (date, slot_name, explanation)
    """
    standard_slots = [
        "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
        "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", 
        "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
    ]
    
    current_date = start_date
    checked_days = 0
    
    while checked_days < 7:
        slots = crud.get_doctor_slots(doctor_id, current_date)
        slots_map = {s["time_slot"]: s["is_booked"] for s in slots}
        
        # Ensure all standard slots exist in the mapping
        for s in standard_slots:
            if s not in slots_map:
                slots_map[s] = 0
                
        # Find first free slot
        for idx, slot in enumerate(standard_slots):
            if patient_type == "New":
                # Requires 2 consecutive slots
                if idx < len(standard_slots) - 1:
                    slot_current = standard_slots[idx]
                    slot_next = standard_slots[idx + 1]
                    if slots_map[slot_current] == 0 and slots_map[slot_next] == 0:
                        return current_date, slot_current, ""
            else:
                # Requires only 1 slot
                slot_current = standard_slots[idx]
                if slots_map[slot_current] == 0:
                    return current_date, slot_current, ""
                    
        # If full, move to next day
        try:
            date_obj = datetime.strptime(current_date, "%Y-%m-%d")
        except ValueError:
            date_obj = datetime.now()
        current_date = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
        checked_days += 1
        
    return start_date, "10:00 AM", "Full"

def process_whatsapp_message(phone_number: str, message: str) -> dict:
    session = database.get_whatsapp_session(phone_number)
    text = message.strip()
    step = session.get("step", "IDLE")
    now_time = datetime.now().strftime("%I:%M %p")
    tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    patient_name = session.get("patient_name") or "WhatsApp Patient"
    
    # Detect language of incoming message
    language = detect_language(text)
    
    # Save patient message
    database.save_whatsapp_message(phone_number, patient_name, "patient", message)
    
    def respond(reply_text, next_step="IDLE", lang=None):
        database.save_whatsapp_message(phone_number, patient_name, "bot", reply_text)
        return {"reply": reply_text, "phone_number": phone_number, "step": next_step, "timestamp": now_time, "language": lang}
    
    # Convert to lowercase for keyword matching
    text_lower = text.lower()
    
    # 1. Greetings & Menu
    greetings = ['hi', 'hello', 'hey', 'vanakkam', 'vanakam', 'start', 'menu', 'help', 'வணக்கம்']
    if text_lower in greetings or text_lower in ['0']:
        database.save_whatsapp_session(phone_number, step="IDLE")
        reply = get_response_in_language(language, 'welcome')
        return respond(reply, "IDLE", language)
    
    # 2. Emergency - Support all languages
    emergency_words = ['emergency', 'sos', 'ambulance', 'avsaram', 'அவசர']
    if text_lower == '2' or any(word in text_lower for word in emergency_words):
        if language == 'tamil':
            reply = """🚨 *அவசர SOS எச்சரிக்கை செயல்படுத்தப்பட்டது!*

📞 **அவசர உதவிக்கு: 108 / +91 98765 91100**
🚑 ஆம்புலன்ஸ் வாகனம் உங்கள் இருப்பிடத்திற்கு அனுப்பப்பட்டது!
⏱️ வரும் நேரம்: 8 நிமிடங்கள்"""
        elif language == 'tanglish':
            reply = """🚨 *Emergency SOS Alert Activated!*

📞 **Call Emergency Helpline: 108 / +91 98765 91100**
🚑 Ambulance ungal location ku dispatch pannapatuchu!
⏱️ Live ETA: 8 Mins"""
        else:
            reply = """🚨 *EMERGENCY SOS ALERT ACTIVATED!*

📞 **Call Emergency Helpline Direct: 108 / +91 98765 91100**
🚑 Emergency Ambulance has been dispatched to your location!
⏱️ Live ETA: 8 Mins"""
        return respond(reply, "IDLE", language)
    
    # 3. Numbered menu options with language support
    if text == "1":
        database.save_whatsapp_session(phone_number, step="WAITING_NAME")
        reply = get_response_in_language(language, 'ask_name')
        return respond(reply, "WAITING_NAME", language)
    
    if text == "3" or "lab" in text_lower or "report" in text_lower or "test" in text_lower:
        if language == 'tamil':
            reply = f"""🧪 *லேப் பரிசோதனை முடிவுகள்*

📄 **நோயாளி:** {patient_name}
🔬 **பரிசோதனை:** CBC / இரத்த பரிசோதனை
✅ **நிலை:** அறிக்கை தயார்
📊 **சுருக்கம்:** ஹீமோகுளோபின் 14.2 g/dL (இயல்பான அளவு)

🔗 PDF பதிவிறக்க: `/static/reports/cbc_david_miller.pdf`"""
        elif language == 'tanglish':
            reply = f"""🧪 *Lab Reports / லேப் ரிப்போர்ட்*

📄 **Patient:** {patient_name}
🔬 **Test:** CBC / Blood Test
✅ **Status:** Report Ready
📊 **Summary:** Hemoglobin 14.2 g/dL (Normal Range)

🔗 Click to download PDF: `/static/reports/cbc_david_miller.pdf`"""
        else:
            reply = f"""🧪 *Lab Diagnostics Status*

📄 **Patient:** {patient_name}
🔬 **Test:** CBC / Blood Test
✅ **Status:** Report Ready & Verified
📊 **Summary:** Hemoglobin 14.2 g/dL (Normal Range)

🔗 Click to download PDF: `/static/reports/cbc_david_miller.pdf`"""
        return respond(reply, "IDLE", language)
    
    # 4. Doctor list with language support
    if text == "5" or "doctor" in text_lower or "fee" in text_lower:
        if language == 'tamil':
            reply = """👨‍⚕️ *சிறப்பு மருத்துவர்கள் & கட்டணம்*

1. **டாக்டர் அலெக்சாண்டர் வான்ஸ்** (இதயவியல்) - ₹1,500
2. **டாக்டர் எலெனா ரோஸ்டோவா** (நரம்பியல்) - ₹1,800
3. **டாக்டர் மார்கஸ் தோர்ன்** (எலும்பியல்) - ₹1,400
4. **டாக்டர் சோபியா லின்** (தோல்) - ₹1,200
5. **டாக்டர் டேவிட் மில்லர்** (குழந்தைகள்) - ₹1,100
6. **டாக்டர் ஜேம்ஸ் வில்சன்** (பொது மருத்துவம்) - ₹800

அப்பாயிண்ட்மெண்ட் புக் செய்ய **1** ஐ அழுத்தவும்."""
        elif language == 'tanglish':
            reply = """👨‍⚕️ *Specialist Doctors & Fees*

1. **Dr. Alexander Vance** (Cardiology) - ₹1,500
2. **Dr. Elena Rostova** (Neurology) - ₹1,800
3. **Dr. Marcus Thorne** (Orthopedics) - ₹1,400
4. **Dr. Sophia Lin** (Dermatology) - ₹1,200
5. **Dr. David Miller** (Pediatrics) - ₹1,100
6. **Dr. James Wilson** (General Medicine) - ₹800

Book panna **1** nu type pannunga."""
        else:
            reply = """👨‍⚕️ *Specialist Consultants & Fees*

1. **Dr. Alexander Vance** (Cardiology) - ₹1,500
2. **Dr. Elena Rostova** (Neurology) - ₹1,800
3. **Dr. Marcus Thorne** (Orthopedics) - ₹1,400
4. **Dr. Sophia Lin** (Dermatology) - ₹1,200
5. **Dr. David Miller** (Pediatrics) - ₹1,100
6. **Dr. James Wilson** (General Medicine) - ₹800

Type **1** to book slot."""
        return respond(reply, "IDLE", language)
    
    # 5. Booking flow with language preservation
    if step == "WAITING_NAME":
        # Store name and ask age in same language
        database.save_whatsapp_session(phone_number, step="WAITING_AGE", patient_name=text)
        reply = f"Thank you, *{text}*!\n\n{get_response_in_language(language, 'ask_age')}"
        return respond(reply, "WAITING_AGE", language)
    
    if step == "WAITING_AGE":
        try:
            age_val = int(re.search(r'\d+', text_lower).group())
        except Exception:
            age_val = 30
        database.save_whatsapp_session(phone_number, step="WAITING_SYMPTOMS", patient_name=session.get("patient_name"), patient_age=age_val)
        reply = get_response_in_language(language, 'ask_symptoms')
        return respond(reply, "WAITING_SYMPTOMS", language)
    
    if step == "WAITING_SYMPTOMS":
        # Store symptoms and generate recommendation
        p_name = session.get("patient_name") or "WhatsApp Patient"
        p_age = session.get("patient_age") or 32
        symptoms_str = message
        
        # AI Triage
        triage = analyze_symptom_triage(symptoms_str, age=p_age)
        doc = triage["recommended_doctors"][0] if triage["recommended_doctors"] else crud.get_doctors()[0]
        
        dept_name = triage["recommended_department_name"]
        
        # Prepare confirmation message based on language
        if language == 'tamil':
            dept_tamil = {
                "Emergency & Trauma": "அவசர & விபத்து",
                "Neurology": "நரம்பியல்",
                "Orthopedics": "எலும்பியல்",
                "Oncology": "புற்றுநோயியல்",
                "Dermatology": "தோல் மருத்துவம்",
                "Pediatrics": "குழந்தைகள் மருத்துவம்",
                "General Medicine": "பொது மருத்துவம்"
            }.get(dept_name, dept_name)
            
            reply = f"""💡 *AuraCare AI பரிந்துரை*

உங்கள் அறிகுறிகளை ('_{symptoms_str}_') வைத்து, **{dept_tamil}** பிரிவு பரிந்துரைக்கப்படுகிறது.

👨‍⚕️ **மருத்துவர்:** {doc['name']}
💳 **கட்டணம்:** ₹{doc['fee']}

📅 **தேதி தேர்வு (Date Selection):**
உங்களுக்கு இன்று அப்பாயிண்ட்மெண்ட் வேண்டுமா அல்லது நாளை வேண்டுமா?
👉 **'இன்று'** அல்லது **'நாளை'** என்று டைப் செய்யவும்."""
        
        elif language == 'tanglish':
            reply = f"""💡 *AuraCare AI Recommendation*

Unga symptoms ('_{symptoms_str}_') based on **{dept_name}** department suggest pannapatuthu.

👨‍⚕️ **Doctor:** {doc['name']}
💳 **Fee:** ₹{doc['fee']}

📅 **Date Selection:**
Ungaluku Today appointment venuma illa Tomorrow venuma?
👉 **'Today'** illa **'Tomorrow'** nu reply pannunga."""
        
        else:
            reply = f"""💡 *AuraCare AI Recommendation*

Based on your symptoms ('_{symptoms_str}_'), we suggest the **{dept_name}** department.

👨‍⚕️ **Doctor:** {doc['name']}
💳 **Consultation Fee:** ₹{doc['fee']}

📅 **Date Selection:**
Do you want to book for Today or Tomorrow?
👉 Reply with **'Today'** or **'Tomorrow'**."""
        
        triage_data = {
            "triage_level": triage.get("triage_level", "ROUTINE"),
            "urgency_score": triage.get("urgency_score", 1),
            "recommended_department_name": dept_name,
            "doctor_id": doc["id"],
            "doctor_name": doc["name"],
            "doctor_fee": doc["fee"]
        }
        
        database.save_whatsapp_session(
            phone_number, 
            step="WAITING_DATE_CHOICE", 
            patient_name=p_name,
            patient_age=p_age,
            symptoms=symptoms_str,
            triage_data=triage_data
        )
        return respond(reply, "WAITING_DATE_CHOICE", language)

    if step == "WAITING_DATE_CHOICE":
        triage_data = session.get("triage_data") or {}
        
        # Parse Today or Tomorrow choice
        is_today = any(w in text_lower for w in ["tod", "indr", "இன்று", "intru"])
        is_tomorrow = any(w in text_lower for w in ["tom", "naal", "நாளை", "nalai"])
        
        if is_today:
            selected_date = datetime.now().strftime("%Y-%m-%d")
            date_label = "Today"
        else:
            selected_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            date_label = "Tomorrow"
            
        triage_data["selected_date"] = selected_date
        triage_data["selected_date_label"] = date_label
        
        if language == 'tamil':
            reply = """📝 **நோயாளி வகை (Patient Type):**
நீங்கள் புதிய நோயாளியா அல்லது ஏற்கனவே பதிவு செய்த பழைய நோயாளியா?
👉 **'புதிய'** அல்லது **'பழைய'** என்று டைப் செய்யவும்."""
        elif language == 'tanglish':
            reply = """📝 **Patient Type:**
Neenga New patient ah illa Old/Existing patient ah?
👉 **'New'** illa **'Old'** nu type pannunga."""
        else:
            reply = """📝 **Patient Type:**
Are you a New patient or an Existing (Old) patient?
👉 Reply with **'New'** or **'Old'**."""
            
        database.save_whatsapp_session(
            phone_number,
            step="WAITING_PATIENT_TYPE",
            patient_name=session.get("patient_name"),
            patient_age=session.get("patient_age"),
            symptoms=session.get("symptoms"),
            triage_data=triage_data
        )
        return respond(reply, "WAITING_PATIENT_TYPE", language)

    if step == "WAITING_PATIENT_TYPE":
        triage_data = session.get("triage_data") or {}
        
        is_old = any(w in text_lower for w in ["old", "pazh", "பழைய", "exist", "yark", "ஏற்கனவே"])
        
        if is_old:
            triage_data["patient_type"] = "Old"
            
            if language == 'tamil':
                reply = "💳 தயவுசெய்து உங்கள் **Patient ID**-ஐ டைப் செய்யவும் (எ.கா. PAT-101):"
            elif language == 'tanglish':
                reply = "💳 Unga **Patient ID** ah type pannunga (e.g. PAT-101):"
            else:
                reply = "💳 Please enter your **Patient ID** (e.g. PAT-101):"
                
            database.save_whatsapp_session(
                phone_number,
                step="WAITING_PATIENT_ID",
                patient_name=session.get("patient_name"),
                patient_age=session.get("patient_age"),
                symptoms=session.get("symptoms"),
                triage_data=triage_data
            )
            return respond(reply, "WAITING_PATIENT_ID", language)
        else:
            triage_data["patient_type"] = "New"
            doc_id = triage_data.get("doctor_id", 1)
            start_date = triage_data.get("selected_date")
            
            final_date, final_slot, err = find_available_slot(doc_id, start_date, "New")
            triage_data["final_date"] = final_date
            triage_data["final_slot"] = final_slot
            
            is_rolled_over = (final_date != start_date)
            
            if language == 'tamil':
                roll_msg = f"\n⚠️ *குறிப்பு:* இன்று அனைத்து நேரமும் முன்பதிவு செய்யப்பட்டுவிட்டது. எனவே அடுத்த கிடைக்கும் தேதி: *{final_date}*." if is_rolled_over else ""
                reply = f"""💡 *அப்பாயிண்ட்மெண்ட் உறுதிப்படுத்தல் (New Patient)*
{roll_msg}
👤 **நோயாளி:** {session.get("patient_name")} (புதிய நோயாளி - 1 மணி நேர அப்பாயிண்ட்மெண்ட்)
👨‍⚕️ **மருத்துவர்:** {triage_data.get("doctor_name")}
📅 **தேதி & நேரம்:** {final_date} @ {final_slot}
⏱️ **காலஅளவு:** 1 மணி நேரம் (1 Hour Slot)
💳 **கட்டணம்:** ₹{triage_data.get("doctor_fee")}

இந்த அப்பாயிண்ட்மெண்டை உறுதி செய்யலாமா?
👉 **'ஆமா'** அல்லது **'இல்லை'** என்று டைப் செய்யவும்!"""
            elif language == 'tanglish':
                roll_msg = f"\n⚠️ *Note:* Selected date full-a book agiduchi. Next available date: *{final_date}*." if is_rolled_over else ""
                reply = f"""💡 *Confirm Appointment (New Patient)*
{roll_msg}
👤 **Patient:** {session.get("patient_name")} (New Patient - 1 Hour Slot)
👨‍⚕️ **Doctor:** {triage_data.get("doctor_name")}
📅 **Date & Time:** {final_date} @ {final_slot}
⏱️ **Duration:** 1 Hour
💳 **Fee:** ₹{triage_data.get("doctor_fee")}

Indha appointment ah confirm pannalama?
👉 **'AAMA'** illa **'ILLA'** nu type pannunga!"""
            else:
                roll_msg = f"\n⚠️ *Note:* Requested date was fully booked. Next available: *{final_date}*." if is_rolled_over else ""
                reply = f"""💡 *Confirm Appointment (New Patient)*
{roll_msg}
👤 **Patient:** {session.get("patient_name")} (New Patient - 1 Hour Slot)
👨‍⚕️ **Doctor:** {triage_data.get("doctor_name")}
📅 **Date & Time:** {final_date} @ {final_slot}
⏱️ **Duration:** 1 Hour
💳 **Fee:** ₹{triage_data.get("doctor_fee")}

Would you like to confirm this booking?
👉 Reply **'YES'** or **'NO'**!"""

            database.save_whatsapp_session(
                phone_number,
                step="WAITING_CONFIRM",
                patient_name=session.get("patient_name"),
                patient_age=session.get("patient_age"),
                symptoms=session.get("symptoms"),
                triage_data=triage_data
            )
            return respond(reply, "WAITING_CONFIRM", language)

    if step == "WAITING_PATIENT_ID":
        triage_data = session.get("triage_data") or {}
        triage_data["patient_id"] = text
        triage_data["patient_type"] = "Old"
        
        doc_id = triage_data.get("doctor_id", 1)
        start_date = triage_data.get("selected_date")
        
        final_date, final_slot, err = find_available_slot(doc_id, start_date, "Old")
        triage_data["final_date"] = final_date
        triage_data["final_slot"] = final_slot
        
        is_rolled_over = (final_date != start_date)
        
        if language == 'tamil':
            roll_msg = f"\n⚠️ *குறிப்பு:* இன்று அனைத்து நேரமும் முன்பதிவு செய்யப்பட்டுவிட்டது. எனவே அடுத்த கிடைக்கும் தேதி: *{final_date}*." if is_rolled_over else ""
            reply = f"""💡 *அப்பாயிண்ட்மெண்ட் உறுதிப்படுத்தல் (Existing Patient)*
{roll_msg}
👤 **நோயாளி:** {session.get("patient_name")} (பழைய நோயாளி ID: {text} - 30 நிமிடம் அப்பாயிண்ட்மெண்ட்)
👨‍⚕️ **மருத்துவர்:** {triage_data.get("doctor_name")}
📅 **தேதி & நேரம்:** {final_date} @ {final_slot}
⏱️ **காலஅளவு:** 30 நிமிடங்கள் (30 Mins)
💳 **கட்டணம்:** ₹{triage_data.get("doctor_fee")}

இந்த அப்பாயிண்ட்மெண்டை உறுதி செய்யலாமா?
👉 **'ஆமா'** அல்லது **'இல்லை'** என்று டைப் செய்யவும்!"""
        elif language == 'tanglish':
            roll_msg = f"\n⚠️ *Note:* Selected date full-a book agiduchi. Next available date: *{final_date}*." if is_rolled_over else ""
            reply = f"""💡 *Confirm Appointment (Existing Patient)*
{roll_msg}
👤 **Patient:** {session.get("patient_name")} (Old Patient ID: {text} - 30 Mins Slot)
👨‍⚕️ **Doctor:** {triage_data.get("doctor_name")}
📅 **Date & Time:** {final_date} @ {final_slot}
⏱️ **Duration:** 30 Mins
💳 **Fee:** ₹{triage_data.get("doctor_fee")}

Indha appointment ah confirm pannalama?
👉 **'AAMA'** illa **'ILLA'** nu type pannunga!"""
        else:
            roll_msg = f"\n⚠️ *Note:* Requested date was fully booked. Next available: *{final_date}*." if is_rolled_over else ""
            reply = f"""💡 *Confirm Appointment (Existing Patient)*
{roll_msg}
👤 **Patient:** {session.get("patient_name")} (Old Patient ID: {text} - 30 Mins Slot)
👨‍⚕️ **Doctor:** {triage_data.get("doctor_name")}
📅 **Date & Time:** {final_date} @ {final_slot}
⏱️ **Duration:** 30 Mins
💳 **Fee:** ₹{triage_data.get("doctor_fee")}

Would you like to confirm this booking?
👉 Reply **'YES'** or **'NO'**!"""

        database.save_whatsapp_session(
            phone_number,
            step="WAITING_CONFIRM",
            patient_name=session.get("patient_name"),
            patient_age=session.get("patient_age"),
            symptoms=session.get("symptoms"),
            triage_data=triage_data
        )
        return respond(reply, "WAITING_CONFIRM", language)

    if step == "WAITING_CONFIRM":
        confirm_words = ['yes', 'aama', 'yeah', 'sure', 'ok', 'confirm', 'ஆமா', 'sari', 'okay']
        decline_words = ['no', 'illa', 'illai', 'not', 'cancel', 'இல்லை', 'venda', 'vendaam']
        
        if text_lower in confirm_words or any(word in text_lower for word in confirm_words):
            p_name = session.get("patient_name")
            p_age = session.get("patient_age")
            symptoms_str = session.get("symptoms", "General consultation")
            triage_data = session.get("triage_data", {})
            
            p_type = triage_data.get("patient_type", "New")
            final_date = triage_data.get("final_date")
            final_slot = triage_data.get("final_slot")
            
            booking_data = {
                "doctor_id": triage_data.get("doctor_id", 1),
                "appointment_date": final_date,
                "time_slot": final_slot,
                "patient_name": p_name,
                "patient_age": p_age,
                "patient_gender": "Male",
                "patient_phone": phone_number,
                "patient_email": "new.patient@auracare.ai" if p_type == "New" else "whatsapp.patient@auracare.ai",
                "symptoms": symptoms_str,
                "triage_level": triage_data.get("triage_level", "ROUTINE"),
                "urgency_score": triage_data.get("urgency_score", 1),
                "payment_method": "WhatsApp UPI Auto-Pay",
                "booking_source": "WhatsApp"
            }
            
            res = crud.create_appointment(booking_data)
            database.clear_whatsapp_session(phone_number)
            
            duration_label = "1 மணி நேரம் (1 Hour)" if p_type == "New" else "30 நிமிடங்கள் (30 Mins)"
            
            if language == 'tamil':
                reply = f"""🎉 *அப்பாயிண்ட்மெண்ட் உறுதி செய்யப்பட்டது!*

🎫 **குறியீடு:** `{res['booking_code']}`
👤 **நோயாளி:** {p_name} ({p_age} வயது) [{p_type}]
👨‍⚕️ **மருத்துவர்:** {res['doctor_name']} ({res['department_name']})
📅 **தேதி & நேரம்:** {final_date} @ {final_slot}
⏱️ **காலஅளவு:** {duration_label}
📍 **அறை:** அறை 101
💳 **கட்டணம்:** ₹{res['fee']:.2f} (செலுத்தப்பட்டது)

🔔 அப்பாயிண்ட்மெண்டிற்கு முன் SMS நினைவூட்டல் அனுப்பப்படும்!
மருத்துவமனைக்கு வரும்போது இந்த மெசேஜ்ஐ காட்டவும்."""
            
            elif language == 'tanglish':
                reply = f"""🎉 *APPOINTMENT CONFIRMED!*

🎫 **Booking Code:** `{res['booking_code']}`
👤 **Patient:** {p_name} ({p_age} yrs) [{p_type}]
👨‍⚕️ **Doctor:** {res['doctor_name']} ({res['department_name']})
📅 **Date & Time:** {final_date} @ {final_slot}
⏱️ **Duration:** {duration_label}
📍 **Room:** Room 101
💳 **Fee:** ₹{res['fee']:.2f} (Paid)

🔔 SMS reminder appointment ku munnadi anuppapatum!
Hospital ku vara podhu indha message ah kaattunga."""
            
            else:
                reply = f"""🎉 *APPOINTMENT CONFIRMED!*

🎫 **Booking Reference:** `{res['booking_code']}`
👤 **Patient:** {p_name} ({p_age} yrs) [{p_type}]
👨‍⚕️ **Doctor:** {res['doctor_name']} ({res['department_name']})
📅 **Date & Time:** {final_date} at {final_slot}
⏱️ **Duration:** {duration_label}
📍 **Consultation Room:** Room 101
💳 **Consultation Fee:** ₹{res['fee']:.2f} (Paid)

🔔 SMS reminder will be sent before appointment!
Please show this message when you visit the hospital."""
            
            return respond(reply, "IDLE", language)
        
        elif text_lower in decline_words or any(word in text_lower for word in decline_words):
            if language == 'tamil':
                reply = "✅ அப்பாயிண்ட்மெண்ட் ரத்து செய்யப்பட்டது. மற்ற உதவிகளுக்கு மெனுவைப் பார்க்கவும்."
            elif language == 'tanglish':
                reply = "✅ Appointment cancelled. Help venumna menu va paakkavum."
            else:
                reply = "✅ Appointment cancelled. Please check the menu for other services."
            
            database.clear_whatsapp_session(phone_number)
            return respond(reply, "IDLE", language)
    
    # 6. Smart symptom detection with language support
    if step == "IDLE":
        # Check if it's a symptom description
        symptom_indicators = ['fever', 'pain', 'cough', 'headache', 'sali', 'vali', 'irumal', 'thala vali', 
                             'vaiiru vali', 'kaychal', 'odambu vali', 'nenju', 'moochu']
        
        if any(indicator in text_lower for indicator in symptom_indicators):
            # Run triage and suggest booking
            triage = analyze_symptom_triage(text)
            doc = triage["recommended_doctors"][0] if triage["recommended_doctors"] else crud.get_doctors()[0]
            
            if language == 'tamil':
                dept_tamil = {
                    "Emergency & Trauma": "அவசர & விபத்து",
                    "Neurology": "நரம்பியல்",
                    "Orthopedics": "எலும்பியல்",
                    "Oncology": "புற்றுநோயியல்",
                    "Dermatology": "தோல் மருத்துவம்",
                    "Pediatrics": "குழந்தைகள் மருத்துவம்",
                    "General Medicine": "பொது மருத்துவம்"
                }.get(triage["recommended_department_name"], triage["recommended_department_name"])
                
                reply = f"""💡 *AuraCare AI பரிந்துரை*

உங்கள் அறிகுறிகளை ('_{text}_') வைத்து **{dept_tamil}** பிரிவு பரிந்துரைக்கப்படுகிறது.

📅 **கிடைக்கும் நேரம்:** நாளை காலை 10:00 AM
💳 **கட்டணம்:** ₹{doc.get('fee', 800)}

அப்பாயிண்ட்மெண்ட் புக் செய்ய **1** ஐ அழுத்தவும்."""
            
            elif language == 'tanglish':
                reply = f"""💡 *AuraCare AI Recommendation*

Unga symptoms ('_{text}_') based on **{triage['recommended_department_name']}** department suggest pannapatuthu.

📅 **Available Slot:** Tomorrow at 10:00 AM
💳 **Fee:** ₹{doc.get('fee', 800)}

Book panna **1** nu type pannunga."""
            
            else:
                reply = f"""💡 *AuraCare AI Recommendation*

Based on your symptoms ('_{text}_'), we suggest the **{triage['recommended_department_name']}** department.

📅 **Available Slot:** Tomorrow at 10:00 AM
💳 **Consultation Fee:** ₹{doc.get('fee', 800)}

Type **1** to book now."""
            
            database.save_whatsapp_session(
                phone_number,
                step="IDLE",
                patient_name=patient_name,
                symptoms=text,
                triage_data=triage
            )
            return respond(reply, "IDLE", language)
        
        # Default response for unrecognized input
        if language == 'tamil':
            reply = """🙏 மன்னிக்கவும், நான் புரியவில்லை. 
தயவுசெய்து மெனுவிலிருந்து (1-8) ஒரு எண்ணை அழுத்தவும் 
அல்லது உங்கள் அறிகுறிகளை டைப் செய்யவும்."""
        elif language == 'tanglish':
            reply = """🙏 Sorry, puriyala. 
Menu la irundhu (1-8) number ah type pannunga 
illa unga symptoms ah type pannunga."""
        else:
            reply = """🙏 Sorry, I didn't understand that. 
Please type a number from the menu (1-8) 
or describe your symptoms."""
        
        return respond(reply, "IDLE", language)
    
    # Fallback
    if language == 'tamil':
        reply = "📋 மேலும் உதவிக்கு, தயவுசெய்து 1-8 எண்களில் ஒன்றை அழுத்தவும்."
    elif language == 'tanglish':
        reply = "📋 Intha menu options (1-8) la oru number ah type pannunga."
    else:
        reply = "📋 Please type a number from the menu (1-8) for assistance."
    
    return respond(reply, "IDLE", language)

# Keep the existing analyze_symptom_triage function as is
def analyze_symptom_triage(symptoms: str, age: int = 30, gender: str = "Unspecified", severity: int = 3, duration: str = "1-3 days", history: str = "None"):
    text = symptoms.lower()
    
    # Keyword Categorization Engine
    critical_keywords = ["chest pain", "cardiac", "stroke", "unconscious", "unable to breathe", "severe bleeding", "paralysis", "heart attack", "fits"]
    high_keywords = ["high fever", "fracture", "severe pain", "head injury", "seizure", "blurred vision", "dizziness", "numbness", "cancer", "tumor"]
    moderate_keywords = ["fever", "cough", "vomiting", "diarrhea", "stomach ache", "child", "baby", "infant", "toddler", "joint pain"]
    dermatology_keywords = ["skin", "rash", "acne", "itching", "spot", "allergy"]
    
    if any(k in text for k in critical_keywords) or severity >= 5:
        triage_level = "EMERGENCY - LEVEL 1"
        urgency_score = 4
        dept_id = 8 # Emergency & Trauma
        dept_name = "Emergency & Trauma"
        rec_reason = "CRITICAL WARNING: Severe acute symptoms detected. Immediate emergency resuscitation & cardiac monitoring required."
        priority_color = "#FF385C" # Red
    elif any(k in text for k in high_keywords) or severity == 4:
        triage_level = "HIGH PRIORITY"
        urgency_score = 3
        if "head" in text or "seizure" in text or "numbness" in text or "blurred" in text:
            dept_id = 2 # Neurology
            dept_name = "Neurology"
        elif "fracture" in text or "bone" in text:
            dept_id = 3 # Orthopedics
            dept_name = "Orthopedics"
        elif "cancer" in text or "tumor" in text:
            dept_id = 6 # Oncology
            dept_name = "Oncology"
        else:
            dept_id = 7 # General Medicine
            dept_name = "General Medicine"
        rec_reason = "Urgent symptoms flagged. Priority specialist consultation recommended within 2 hours."
        priority_color = "#FF9F43" # Orange
    elif any(k in text for k in dermatology_keywords):
        triage_level = "ROUTINE"
        urgency_score = 1
        dept_id = 4 # Dermatology
        dept_name = "Dermatology"
        rec_reason = "Dermatological profile matched. Scheduled outpatient skin evaluation suggested."
        priority_color = "#10B981" # Green
    elif "child" in text or "baby" in text or "infant" in text or age < 12:
        triage_level = "MODERATE"
        urgency_score = 2
        dept_id = 5 # Pediatrics
        dept_name = "Pediatrics"
        rec_reason = "Pediatric consultation recommended based on age profile and pediatric symptoms."
        priority_color = "#F59E0B" # Yellow
    else:
        triage_level = "MODERATE" if severity >= 3 else "ROUTINE"
        urgency_score = 2 if severity >= 3 else 1
        dept_id = 7 # General Medicine
        dept_name = "General Medicine"
        rec_reason = "General internal medicine clinical assessment suggested for holistic evaluation."
        priority_color = "#F59E0B" if urgency_score == 2 else "#10B981"

    doctors = crud.get_doctors(department_id=dept_id)

    return {
        "triage_level": triage_level,
        "urgency_score": urgency_score,
        "recommended_department_id": dept_id,
        "recommended_department_name": dept_name,
        "recommendation_reason": rec_reason,
        "priority_color": priority_color,
        "recommended_doctors": doctors
    }