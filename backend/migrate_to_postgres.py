"""
CivicRoute SQLite to PostgreSQL Migration Script
------------------------------------------------
Safely copies all existing records from the local SQLite database
(civicroute.db) to a remote PostgreSQL database (such as Neon or Render PostgreSQL).

Usage:
    python migrate_to_postgres.py <TARGET_POSTGRES_URL>
or:
    python migrate_to_postgres.py   (reads TARGET_DATABASE_URL or DATABASE_URL from .env or environment)

This script is 100% non-destructive and leaves the local SQLite database untouched.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import Base, normalize_database_url
from models import (
    User,
    Authority,
    Department,
    Complaint,
    ComplaintStatusHistory,
    Notification,
    PasswordResetToken
)

TABLE_ORDER = [
    ("users", User),
    ("authorities", Authority),
    ("departments", Department),
    ("complaints", Complaint),
    ("complaint_status_history", ComplaintStatusHistory),
    ("notifications", Notification),
    ("password_reset_tokens", PasswordResetToken),
]


def get_target_url():
    if len(sys.argv) > 1 and sys.argv[1].strip():
        return sys.argv[1].strip()
    
    url = os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL")
    if url:
        return url.strip()
    
    return None


def run_migration():
    print("=" * 60)
    print("CivicRoute Database Migration: SQLite -> PostgreSQL")
    print("=" * 60)

    target_url = get_target_url()
    if not target_url:
        print("\nERROR: No PostgreSQL connection URL provided.")
        print("Please provide the connection string as an argument:")
        print("  python migrate_to_postgres.py postgresql://user:pass@ep-xyz.neon.tech/civicroute?sslmode=require")
        print("Or set TARGET_DATABASE_URL in your environment / backend/.env file.\n")
        sys.exit(1)

    # Normalize url to use postgresql+psycopg2://
    target_url = normalize_database_url(target_url)

    sqlite_path = os.path.join(CURRENT_DIR, "civicroute.db")
    if not os.path.exists(sqlite_path):
        print(f"ERROR: Local SQLite database not found at {sqlite_path}")
        sys.exit(1)

    sqlite_url = f"sqlite:///{sqlite_path}"
    print(f"Source DB (SQLite): {sqlite_path}")
    masked_target = target_url
    if "@" in target_url:
        protocol_and_creds, host_part = target_url.split("@", 1)
        if ":" in protocol_and_creds:
            proto, rest = protocol_and_creds.split("://", 1)
            user = rest.split(":")[0] if ":" in rest else rest
            masked_target = f"{proto}://{user}:****@{host_part}"
    print(f"Target DB (Postgres): {masked_target}")

    # Create engines
    source_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    target_engine = create_engine(target_url, pool_pre_ping=True)

    # Test target connection
    try:
        with target_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("\n[OK] Successfully connected to target PostgreSQL database.")
    except Exception as e:
        print(f"\n[FAIL] Could not connect to target PostgreSQL database: {e}")
        sys.exit(1)

    # Create all tables in target
    print("[*] Ensuring all tables exist in target database...")
    Base.metadata.create_all(bind=target_engine)
    print("[OK] Target database tables verified/created.")

    SourceSession = sessionmaker(bind=source_engine)
    TargetSession = sessionmaker(bind=target_engine)

    total_migrated = 0

    with SourceSession() as src_db, TargetSession() as tgt_db:
        for table_name, model_cls in TABLE_ORDER:
            rows = src_db.query(model_cls).all()
            row_count = len(rows)
            print(f"\nProcessing table '{table_name}' ({row_count} records in SQLite)...")

            if row_count == 0:
                print(f"  -> No records to copy for '{table_name}'.")
                continue

            # Fetch existing IDs in target to avoid duplicates
            existing_ids = set()
            try:
                res = tgt_db.execute(text(f"SELECT id FROM {table_name}")).fetchall()
                existing_ids = {r[0] for r in res}
            except Exception:
                pass

            copied = 0
            skipped = 0
            for row in rows:
                if row.id in existing_ids:
                    skipped += 1
                    continue

                # Create detached copy for target
                data = {c.name: getattr(row, c.name) for c in model_cls.__table__.columns}
                new_obj = model_cls(**data)
                tgt_db.add(new_obj)
                copied += 1

            tgt_db.commit()
            total_migrated += copied
            print(f"  -> Migrated {copied} new records (Skipped {skipped} already present).")

            # Update PostgreSQL sequence counter if table has an 'id' column
            try:
                tgt_db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), coalesce(max(id), 1)) FROM {table_name};"))
                tgt_db.commit()
            except Exception:
                # Sequences might not exist or already be synced
                tgt_db.rollback()

    print("\n" + "=" * 60)
    print(f"Migration completed successfully! Total new records transferred: {total_migrated}")
    print("=" * 60)


if __name__ == "__main__":
    run_migration()

