import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('hospital.db')
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("=== ALL TABLES ===")
for t in tables:
    print(f"  {t[0]}")

print("\n=== DATA COUNTS ===")
for table in ['patients', 'appointments', 'doctors', 'whatsapp_sessions', 'whatsapp_messages', 'payments', 'lab_tests', 'prescriptions']:
    try:
        c.execute(f"SELECT COUNT(*) FROM {table}")
        print(f"  {table}: {c.fetchone()[0]} records")
    except:
        pass

print("\n=== Recent WhatsApp Messages (Latest 10) ===")
try:
    c.execute("SELECT * FROM whatsapp_messages ORDER BY rowid DESC LIMIT 10")
    cols = [d[0] for d in c.description]
    print(f"  Columns: {cols}")
    for r in c.fetchall():
        print(f"  {r}")
except Exception as e:
    print(f"  Error: {e}")

print("\n=== Patients ===")
try:
    c.execute("SELECT * FROM patients")
    cols = [d[0] for d in c.description]
    print(f"  Columns: {cols}")
    for r in c.fetchall():
        print(f"  {r}")
except Exception as e:
    print(f"  Error: {e}")

print("\n=== Appointments ===")
try:
    c.execute("SELECT * FROM appointments")
    cols = [d[0] for d in c.description]
    print(f"  Columns: {cols}")
    for r in c.fetchall():
        print(f"  {r}")
except Exception as e:
    print(f"  Error: {e}")

conn.close()
