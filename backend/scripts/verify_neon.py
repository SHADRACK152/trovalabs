"""
Verify Neon/Postgres connection and print table list and counts.
Usage:
  set DATABASE_URL=postgresql://...  (cmd) or $env:DATABASE_URL=... (PowerShell)
  .venv\Scripts\python.exe backend\scripts\verify_neon.py
"""
import os
import sys
try:
    import psycopg2
except Exception as e:
    print('psycopg2 not installed:', e)
    sys.exit(2)

import sys

url = None
if len(sys.argv) > 1:
    url = sys.argv[1]
else:
    url = os.environ.get('DATABASE_URL')
if not url:
    print('Set DATABASE_URL in environment')
    sys.exit(2)

print('Connecting to Neon...')
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
tables = [r[0] for r in cur.fetchall()]
print(f'Found {len(tables)} tables in public schema')
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t};")
        cnt = cur.fetchone()[0]
    except Exception as e:
        cnt = f'ERROR: {e}'
    print(f"{t}: {cnt}")
cur.close()
conn.close()
print('Done.')
