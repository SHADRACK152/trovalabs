import os
import json

def handler(request):
    """Simple health check that verifies DATABASE_URL is present.
    Deploy this as a Vercel Python Serverless Function at `/api/health`.
    """
    db_url = os.environ.get("DATABASE_URL")
    ok = bool(db_url)
    payload = {
        "status": "ok" if ok else "missing_database_url",
        "database_configured": ok
    }
    return (
        json.dumps(payload),
        {
            "status": 200 if ok else 500,
            "headers": {"content-type": "application/json"}
        }
    )
