"""Regression guard: `temple_photo_repairs` must never become anon-readable.

Unlike anon_repairs_blocked.spec.py (which drives the browser client), this
test talks straight to the Data API with the publishable/anon key, so it fails
if EITHER the table grants OR the RLS policies are loosened for anon.
"""
import os
import re
import sys
from pathlib import Path

import requests

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def read_env(name: str) -> str:
    txt = ENV_PATH.read_text()
    m = re.search(rf"^{name}=(.*)$", txt, re.MULTILINE)
    assert m, f"{name} missing from .env"
    return m.group(1).strip().strip('"').strip("'")


SUPABASE_URL = read_env("VITE_SUPABASE_URL").rstrip("/")
ANON_KEY = read_env("VITE_SUPABASE_PUBLISHABLE_KEY")
TABLE = "temple_photo_repairs"

HEADERS = {"apikey": ANON_KEY, "Accept": "application/json"}

failures = []


def check(label: str, resp: requests.Response):
    body = resp.text[:300]
    # Acceptable: any error status (permission denied / RLS / not exposed).
    if resp.status_code >= 400:
        print(f"OK  {label}: blocked with {resp.status_code} — {body}")
        return
    # 2xx must not carry rows.
    try:
        data = resp.json()
    except Exception:
        data = body
    if isinstance(data, list) and len(data) == 0:
        print(f"OK  {label}: 200 but empty result set (RLS filtered)")
        return
    failures.append(f"{label}: anon received data ({resp.status_code}) -> {body}")
    print(f"FAIL {label}: {resp.status_code} -> {body}")


# 1. Plain select
check("select *", requests.get(f"{SUPABASE_URL}/rest/v1/{TABLE}?select=*&limit=5", headers=HEADERS, timeout=30))

# 2. Exact count (catches head-only leaks of row totals)
check(
    "count",
    requests.get(
        f"{SUPABASE_URL}/rest/v1/{TABLE}?select=id",
        headers={**HEADERS, "Prefer": "count=exact", "Range": "0-0"},
        timeout=30,
    ),
)

# 3. Sensitive columns specifically (internal error messages)
check(
    "select error_message",
    requests.get(f"{SUPABASE_URL}/rest/v1/{TABLE}?select=error_message,source&limit=5", headers=HEADERS, timeout=30),
)

# 4. Writes must be blocked too
insert = requests.post(
    f"{SUPABASE_URL}/rest/v1/{TABLE}",
    headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=representation"},
    json={"temple_id": "00000000-0000-0000-0000-000000000000", "source": "search", "success": True, "triggered_by": "auto"},
    timeout=30,
)
if insert.status_code < 400:
    failures.append(f"insert: anon write succeeded ({insert.status_code}) -> {insert.text[:200]}")
    print(f"FAIL insert: {insert.status_code} -> {insert.text[:200]}")
else:
    print(f"OK  insert: blocked with {insert.status_code} — {insert.text[:200]}")

if failures:
    print("\nREGRESSION: temple_photo_repairs is reachable by anon:")
    for f in failures:
        print(" -", f)
    sys.exit(1)

print("\nPASS: temple_photo_repairs is not readable or writable by anon")
