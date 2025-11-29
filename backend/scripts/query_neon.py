"""
Query Neon/Postgres for sample rows from key tables.
Usage:
  .venv\Scripts\python.exe backend\scripts\query_neon.py "<DATABASE_URL>"

The script prints up to 10 rows from `users`, `audiobooks`, and `messages`.
"""
import sys
import os
try:
    import psycopg2
    import psycopg2.extras
except Exception as e:
    print('psycopg2 not available:', e)
    sys.exit(2)

if len(sys.argv) < 2:
    print('Usage: query_neon.py "<DATABASE_URL>"')
    sys.exit(2)

url = sys.argv[1]

def run_query(cur, sql, params=None):
    try:
        cur.execute(sql, params or ())
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall()
        return cols, rows
    except Exception as e:
        return [], f'ERROR: {e}'

def print_table(name, cols, rows):
    print(f"\n== {name} ({len(rows) if isinstance(rows, list) else 0} rows) ==")
    if isinstance(rows, str):
        print(rows)
        return
    if not rows:
        print('(no rows)')
        return
    print(' | '.join(cols))
    for r in rows:
        # stringify values with safe truncation for long fields
        vals = []
        for v in r:
            s = str(v)
            if len(s) > 200:
                s = s[:200] + '...'
            vals.append(s)
        print(' | '.join(vals))

print('Connecting to database...')
conn = psycopg2.connect(url)
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

queries = {
    'users': 'SELECT * FROM users LIMIT 10;',
    'audiobooks': 'SELECT * FROM audiobooks LIMIT 10;',
    'messages': 'SELECT * FROM messages LIMIT 10;'
}

for name, q in queries.items():
    cols, rows = run_query(cur, q)
    print_table(name, cols, rows)

cur.close()
conn.close()
print('\nDone.')
