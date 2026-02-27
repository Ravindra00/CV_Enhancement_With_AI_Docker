#!/usr/bin/env python3
"""
Migration script to add new columns to the CVs table.
This adds the basic info columns and other new fields.
"""

from sqlalchemy import text
from app.database import engine

def migrate_cvs_table():
    """Add new columns to the CVs table."""
    
    with engine.begin() as connection:
        # List of columns to add with their definitions
        columns_to_add = [
            ("full_name", "VARCHAR(150)"),
            ("email", "VARCHAR(150)"),
            ("phone", "VARCHAR(50)"),
            ("location", "VARCHAR(150)"),
            ("linkedin_url", "TEXT"),
            ("profile_summary", "TEXT"),
            ("current_version", "INTEGER DEFAULT 1"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                print(f"Adding column: {col_name}...", end=" ")
                query = f"ALTER TABLE cvs ADD COLUMN {col_name} {col_type};"
                connection.execute(text(query))
                print("✅")
            except Exception as e:
                if "already exists" in str(e):
                    print("⚠️  (already exists)")
                else:
                    print(f"❌ {str(e)}")
        
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    print("🚀 Starting CVs table migration...")
    print("-" * 50)
    migrate_cvs_table()
    print("-" * 50)
    print("✨ Done!")
