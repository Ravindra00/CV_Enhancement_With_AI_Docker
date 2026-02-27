-- Migration: Add missing JSONB columns to cvs table
-- Run: psql -d your_database -f add_personal_info_column.sql

DO $$
BEGIN
    -- personal_info: editor format {name, title, email, phone, location, linkedin, website, summary, photo}
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cvs' AND column_name = 'personal_info'
    ) THEN
        ALTER TABLE cvs ADD COLUMN personal_info JSONB NULL;
    END IF;

    -- interests: optional list (if missing)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cvs' AND column_name = 'interests'
    ) THEN
        ALTER TABLE cvs ADD COLUMN interests JSONB NULL;
    END IF;
END $$;
