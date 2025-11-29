"""
Simple SQLite -> Postgres copy script.

Usage (cmd.exe):
  set DATABASE_URL=postgres://user:pass@host:5432/dbname
  .venv\Scripts\python.exe backend\scripts\sqlite_to_postgres.py

Notes:
- This is intended for small/medium databases used by the project.
- It uses SQLAlchemy to reflect tables and copy rows. For complex schemas
  or large datasets use `pgloader` or export/import with more control.
"""
import os
import sys
from sqlalchemy import create_engine, MetaData, Table, select, Column, text
from sqlalchemy import Integer, String, Text, DateTime, Boolean, LargeBinary, Float
from sqlalchemy.dialects.postgresql import JSON as PG_JSON

SQLITE_DB = os.environ.get("SQLITE_DB")
PG_URL = os.environ.get("DATABASE_URL")

if not PG_URL:
    print("ERROR: Set DATABASE_URL environment variable to your Postgres/Neon connection string.")
    sys.exit(2)

if not SQLITE_DB:
    # If an explicit SQLITE_DB isn't provided, look for a backup at the project's backend/database folder.
    default_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'lumino.db.bak')
    if os.path.exists(default_path):
        SQLITE_DB = default_path
    else:
        print("ERROR: Set SQLITE_DB environment variable pointing to your local SQLite file or a backup (e.g. backend/database/lumino.db.bak).")
        sys.exit(2)

print(f"Using SQLite DB: {SQLITE_DB}")
print(f"Target Postgres: {PG_URL}")

# Create engines
sqlite_engine = create_engine(f"sqlite:///{SQLITE_DB}")
pg_engine = create_engine(PG_URL)

# Reflect
sqlite_meta = MetaData()
sqlite_meta.reflect(bind=sqlite_engine)

pg_meta = MetaData()
pg_meta.reflect(bind=pg_engine)

# Copy each table
fk_constraints = []
from sqlalchemy import text

for table_name, table in sqlite_meta.tables.items():
    print(f"Processing table: {table_name}")
    # create a compatible table in Postgres if not exists
    if table_name not in pg_meta.tables:
        cols = []
        for c in table.columns:
            coltype = c.type
            # map common SQLite types to Postgres equivalents
            t = None
            s = str(coltype).lower()
            if 'int' in s:
                t = Integer()
            elif 'char' in s or 'varchar' in s or 'string' in s:
                t = String()
            elif 'text' in s:
                t = Text()
            elif 'datetime' in s or 'date' in s or 'timestamp' in s:
                t = DateTime()
            elif 'bool' in s:
                t = Boolean()
            elif 'float' in s or 'real' in s or 'numeric' in s:
                t = Float()
            elif 'blob' in s or 'binary' in s:
                t = LargeBinary()
            elif 'json' in s:
                t = PG_JSON()
            else:
                # fallback to String for unknown types
                t = String()

            # Do not create foreign key constraints yet - create simple columns first
            col = Column(c.name, t, primary_key=c.primary_key, nullable=c.nullable)
            # collect any foreign key to apply later
            if c.foreign_keys:
                for fk_obj in c.foreign_keys:
                    try:
                        ref_table = fk_obj.column.table.name
                        ref_col = fk_obj.column.name
                        fk_constraints.append((table_name, c.name, ref_table, ref_col))
                    except Exception:
                        pass
            cols.append(col)

        pg_table = Table(table_name, pg_meta, *cols)
        try:
            pg_table.create(bind=pg_engine, checkfirst=True)
            print(f"  Created table {table_name} in Postgres")
        except Exception as e:
            print(f"  Could not create table {table_name}: {e}")
    else:
        pg_table = pg_meta.tables[table_name]

    # fetch rows from sqlite
    with sqlite_engine.connect() as sconn:
        rows = sconn.execute(select(table)).fetchall()

    if not rows:
        print(f"  No rows to copy for {table_name}")
        continue

    # prepare insert dicts
    dicts = []
    for r in rows:
        try:
            dicts.append(dict(r))
        except Exception:
            # fallback for Row objects with odd behavior
            dicts.append({c.name: r[idx] for idx, c in enumerate(table.columns)})

    # insert into postgres
    with pg_engine.begin() as pconn:
        try:
            # use the pg_table object for insertion to ensure compatible schema
            pconn.execute(pg_table.insert(), dicts)
            print(f"  Inserted {len(dicts)} rows into {table_name}")
        except Exception as e:
            print(f"  Failed to insert rows into {table_name}: {e}")

print("Done.")
# Now add foreign key constraints (deferred to avoid ordering issues)
if 'fk_constraints' in globals() and fk_constraints:
    from sqlalchemy import text
    with pg_engine.begin() as pconn:
        for (tbl, col, ref_tbl, ref_col) in fk_constraints:
            constraint_name = f"fk_{tbl}_{col}"
            sql = f"ALTER TABLE {tbl} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({col}) REFERENCES {ref_tbl}({ref_col});"
            try:
                pconn.execute(text(sql))
                print(f"Added FK {constraint_name} on {tbl}({col}) -> {ref_tbl}({ref_col})")
            except Exception as e:
                print(f"Failed to add FK {constraint_name}: {e}")
