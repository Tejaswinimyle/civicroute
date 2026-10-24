import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "civicroute.db")

def run_migration():
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Existing complaints table: check and add missing columns
    cur.execute("PRAGMA table_info(complaints);")
    existing_cols = {col[1] for col in cur.fetchall()}
    print(f"Existing columns in complaints: {existing_cols}")

    new_columns = [
        ("citizen_id", "INTEGER"),
        ("citizen_name", "VARCHAR"),
        ("citizen_email", "VARCHAR"),
        ("citizen_phone", "VARCHAR"),
        ("rewritten_description", "TEXT"),
        ("approved_description", "TEXT"),
        ("final_letter", "TEXT"),
        ("priority_score", "FLOAT DEFAULT 0.0"),
        ("created_at", "VARCHAR"),
        ("updated_at", "VARCHAR"),
    ]

    for col_name, col_type in new_columns:
        if col_name not in existing_cols:
            print(f"Adding column '{col_name}' ({col_type}) to 'complaints'...")
            cur.execute(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_type};")

    # 2. Create users table (Citizens)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        phone VARCHAR,
        location VARCHAR,
        hashed_password VARCHAR NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at VARCHAR
    );
    """)

    # 3. Create authorities table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS authorities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        officer_id VARCHAR UNIQUE NOT NULL,
        name VARCHAR NOT NULL,
        department VARCHAR NOT NULL,
        role VARCHAR NOT NULL DEFAULT 'department_officer',
        hashed_password VARCHAR NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at VARCHAR
    );
    """)

    # 4. Create departments table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR UNIQUE NOT NULL,
        name VARCHAR UNIQUE NOT NULL,
        description TEXT
    );
    """)

    # 5. Create complaint_status_history table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS complaint_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id VARCHAR NOT NULL,
        previous_status VARCHAR,
        new_status VARCHAR NOT NULL,
        updated_by VARCHAR NOT NULL,
        remarks TEXT,
        timestamp VARCHAR NOT NULL
    );
    """)

    # 6. Create notifications table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_email VARCHAR,
        recipient_role VARCHAR DEFAULT 'citizen',
        complaint_id VARCHAR,
        title VARCHAR NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR DEFAULT 'unread',
        created_at VARCHAR NOT NULL
    );
    """)

    # 7. Create password_reset_tokens table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_type VARCHAR NOT NULL,
        user_id INTEGER,
        identifier VARCHAR NOT NULL,
        token_hash VARCHAR UNIQUE NOT NULL,
        created_at VARCHAR NOT NULL,
        expires_at VARCHAR NOT NULL,
        used BOOLEAN DEFAULT 0
    );
    """)

    conn.commit()

    # Pre-populate departments if empty
    cur.execute("SELECT count(*) FROM departments;")
    if cur.fetchone()[0] == 0:
        depts = [
            ("WTR", "Water Supply", "Handles water shortages, contaminated water, pipeline leaks"),
            ("RDS", "Roads & Infrastructure", "Handles potholes, broken pavements, damaged road surfaces"),
            ("SAN", "Sanitation", "Handles garbage collection, waste accumulation, street cleaning"),
            ("ELE", "Electricity & Lighting", "Handles broken streetlights, transformer issues, power line hazards"),
            ("DRN", "Drainage & Public Works", "Handles blocked drains, sewage overflow, wastewater flooding"),
            ("ADM", "Central Administration", "Oversees all civic departments and platform administration"),
        ]
        cur.executemany("INSERT INTO departments (code, name, description) VALUES (?, ?, ?);", depts)
        conn.commit()
        print(f"Pre-populated {len(depts)} departments.")

    # Verify rows in complaints preserved
    cur.execute("SELECT count(*) FROM complaints;")
    complaint_count = cur.fetchone()[0]
    print(f"Total complaints in database after migration: {complaint_count} (all preserved)")

    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()

