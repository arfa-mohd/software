import sqlite3

def fix_db():
    try:
        conn = sqlite3.connect('hospital.db')
        cursor = conn.cursor()
        
        # Check if wa_broadcast exists
        cursor.execute("SELECT COUNT(*) FROM custom_pages WHERE key = 'wa_broadcast'")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "INSERT INTO custom_pages (key, title, subtitle, icon, is_custom, columns_json, is_visible, table_name) "
                "VALUES ('wa_broadcast', 'WhatsApp Campaign', 'Bulk Auto Share Poster & Video Campaign', 'fas fa-bullhorn', 0, '[]', 1, '')"
            )
            conn.commit()
            print("Successfully inserted wa_broadcast into DB!")
        else:
            print("wa_broadcast already exists in DB.")
            
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    fix_db()
