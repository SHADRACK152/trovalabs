"""
Run the sqlite -> postgres migration with environment variables set from this script.
This avoids shell quoting issues when DATABASE_URL contains special characters.
"""
import os
import runpy
from backend.config import settings

# Use the configured DATABASE_URL from backend.config (reads backend/.env)
db_url = getattr(settings, 'DATABASE_URL', None)
if not db_url:
    print("ERROR: DATABASE_URL is not configured in backend/.env or environment. Aborting migration.")
    raise SystemExit(2)

os.environ["DATABASE_URL"] = db_url

# Prefer an explicit SQLITE_DB env var, otherwise use the backup path if present
default_sqlite = os.path.join(os.path.dirname(__file__), '..', 'database', 'lumino.db.bak')
if not os.environ.get("SQLITE_DB"):
    if os.path.exists(default_sqlite):
        os.environ["SQLITE_DB"] = default_sqlite
    else:
        print("ERROR: No SQLITE_DB provided and default backup not found. Set SQLITE_DB to your SQLite file.")
        raise SystemExit(2)

print("Starting migration using DATABASE_URL from backend.config and SQLITE_DB=" + os.environ.get("SQLITE_DB", "<none>"))
runpy.run_path(os.path.join(os.path.dirname(__file__), 'sqlite_to_postgres.py'), run_name='__main__')
