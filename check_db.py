import sqlite3

conn = sqlite3.connect('novamind.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("SQLite Tables and row counts:")
for t in tables:
    c.execute(f"SELECT COUNT(1) FROM {t}")
    print(f"  {t}: {c.fetchone()[0]}")
conn.close()
