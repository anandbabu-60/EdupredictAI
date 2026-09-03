"""
==========================================================================
EDUPREDICT AI — DATABASE INSPECTION UTILITY
Run this script to inspect all stored users, sessions, and predictions.
==========================================================================
Usage:
    python backend/view_database.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "edupredict.db"

def inspect_database():
    if not DB_PATH.exists():
        print(f"\n[!] Database file not found at: {DB_PATH}")
        print("    Start backend with 'python backend/app.py' to initialize the database.\n")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n" + "=" * 80)
    print(f" EDUPREDICT AI — DATABASE INSPECTOR ({DB_PATH})")
    print("=" * 80)

    # 1. USERS TABLE
    print("\n[+] REGISTERED USERS TABLE (users):")
    print("-" * 80)
    cursor.execute("SELECT id, name, email, role, password_hash, created_at FROM users ORDER BY id ASC")
    users = cursor.fetchall()

    if not users:
        print("  (No registered users found)")
    else:
        print(f"  {'ID':<4} | {'Name':<26} | {'Email':<30} | {'Role':<10} | {'Created At'}")
        print("  " + "-" * 90)
        for u in users:
            # Mask password hash for display
            pwd_hint = (u['password_hash'][:14] + '...') if u['password_hash'] else 'None'
            created = str(u['created_at'])[:19] if u['created_at'] else 'N/A'
            print(f"  {u['id']:<4} | {u['name']:<26} | {u['email']:<30} | {u['role']:<10} | {created}")

    # 2. ACTIVE SESSIONS TABLE
    print("\n[+] ACTIVE USER SESSIONS (sessions):")
    print("-" * 80)
    cursor.execute("""
        SELECT s.token, s.user_id, u.name, u.email, s.created_at
        FROM sessions s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
    """)
    sessions = cursor.fetchall()
    if not sessions:
        print("  (No active login sessions)")
    else:
        print(f"  {'Token (Prefix)':<18} | {'User ID':<8} | {'User Name':<22} | {'Email'}")
        print("  " + "-" * 75)
        for s in sessions:
            tok_short = s['token'][:16] + '...'
            print(f"  {tok_short:<18} | {s['user_id']:<8} | {(s['name'] or 'Unknown'):<22} | {s['email'] or 'Unknown'}")

    # 3. PREDICTIONS TABLE
    print("\n[+] SAVED PREDICTION RECORDS (predictions):")
    print("-" * 80)
    cursor.execute("""
        SELECT p.id, p.user_id, u.email as user_email, p.student_name, p.exam_score, p.performance, p.created_at
        FROM predictions p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.id DESC
        LIMIT 10
    """)
    preds = cursor.fetchall()
    if not preds:
        print("  (No predictions stored yet)")
    else:
        print(f"  {'ID':<4} | {'User (Owner)':<28} | {'Student Name':<18} | {'Score':<8} | {'Category':<16} | {'Date'}")
        print("  " + "-" * 95)
        for p in preds:
            owner = p['user_email'] or f"User #{p['user_id']}"
            created = str(p['created_at'])[:16] if p['created_at'] else 'N/A'
            print(f"  {p['id']:<4} | {owner:<28} | {p['student_name']:<18} | {p['exam_score']:<8.2f} | {p['performance']:<16} | {created}")

    print("\n" + "=" * 80 + "\n")
    conn.close()

if __name__ == "__main__":
    inspect_database()
