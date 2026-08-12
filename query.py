import sqlite3
conn = sqlite3.connect('hospital_local.db')
cursor = conn.cursor()
cursor.execute('SELECT * FROM custom_pages;')
print(cursor.fetchall())
