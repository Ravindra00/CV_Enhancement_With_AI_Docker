"""
Database migration utilities. Runs on startup to add missing columns.
"""
import logging
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger(__name__)


def _add_column_if_missing(conn, table: str, column: str, col_type: str = "JSONB") -> bool:
    """Add column if it doesn't exist. Returns True if added, False if already exists."""
    check_sql = text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """)
    result = conn.execute(check_sql, {"table": table, "column": column}).fetchone()
    if result:
        return False
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} NULL"))
    return True


def _rename_column_if_exists(conn, table: str, old_name: str, new_name: str, col_type: str = "JSONB") -> bool:
    """Rename column if old exists and new doesn't. Returns True if renamed."""
    check_old = text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """)
    old_exists = conn.execute(check_old, {"table": table, "column": old_name}).fetchone()
    new_exists = conn.execute(check_old, {"table": table, "column": new_name}).fetchone()
    
    if old_exists and not new_exists:
        conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN {old_name} TO {new_name}"))
        return True
    return False


def run_migrations() -> None:
    """Add missing columns and rename old columns. Safe to run multiple times."""
    try:
        with engine.begin() as conn:  # begin() handles commit/rollback automatically
            # CV table migrations
            for col_name in ["personal_info", "interests", "embedding", "custom_sections", "theme"]:
                try:
                    added = _add_column_if_missing(conn, "cvs", col_name)
                    if added:
                        logger.info(f"Migration: added column cvs.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for cvs.{col_name} failed: {e}")

            # Users table: superuser + AI access control
            for col_name, col_type, default in [
                ("is_superuser", "BOOLEAN", "FALSE"),
                ("ai_access",    "BOOLEAN", "TRUE"),
            ]:
                try:
                    check_sql = text("""
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = :col
                    """)
                    if not conn.execute(check_sql, {"col": col_name}).fetchone():
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN {col_name} BOOLEAN NOT NULL DEFAULT {default}"
                        ))
                        logger.info(f"Migration: added users.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for users.{col_name} failed: {e}")

                try:
                    added = _add_column_if_missing(conn, "cvs", col_name)
                    if added:
                        logger.info(f"Migration: added column cvs.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for cvs.{col_name} failed: {e}")
            
            # CVCustomization table migrations
            try:
                added = _add_column_if_missing(conn, "cv_customizations", "missing_keywords")
                if added:
                    logger.info("Migration: added column cv_customizations.missing_keywords")
            except Exception as e:
                logger.warning(f"Migration for cv_customizations.missing_keywords failed: {e}")
            
            # Rename old columns in cv_customizations
            try:
                if _rename_column_if_exists(conn, "cv_customizations", "score", "ats_score"):
                    logger.info("Migration: renamed cv_customizations.score → ats_score")
                if _rename_column_if_exists(conn, "cv_customizations", "customized_data", "customized_snapshot"):
                    logger.info("Migration: renamed cv_customizations.customized_data → customized_snapshot")
            except Exception as e:
                logger.warning(f"Column rename failed: {e}")
            
            # Add missing columns in cv_customizations
            for col_name, col_type in [("ats_score", "INTEGER"), ("similarity_score", "INTEGER"), ("customized_snapshot", "JSONB")]:
                try:
                    added = _add_column_if_missing(conn, "cv_customizations", col_name, col_type)
                    if added:
                        logger.info(f"Migration: added column cv_customizations.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for cv_customizations.{col_name} failed: {e}")
            
            # Suggestions table migrations
            try:
                if _rename_column_if_exists(conn, "suggestions", "suggestion", "suggestion_text"):
                    logger.info("Migration: renamed suggestions.suggestion → suggestion_text")
                else:
                    # If rename didn't happen, add the new column
                    added = _add_column_if_missing(conn, "suggestions", "suggestion_text", "TEXT")
                    if added:
                        logger.info("Migration: added column suggestions.suggestion_text")
                        # Copy data from old column if it exists
                        check_old = text("SELECT 1 FROM information_schema.columns WHERE table_name = 'suggestions' AND column_name = 'suggestion'")
                        if conn.execute(check_old).fetchone():
                            conn.execute(text("UPDATE suggestions SET suggestion_text = suggestion WHERE suggestion_text IS NULL"))
                            logger.info("Migration: copied data from suggestions.suggestion to suggestion_text")
            except Exception as e:
                logger.warning(f"Migration for suggestions.suggestion_text failed: {e}")
                
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        raise
