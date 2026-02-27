from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    Enum,
    Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
import enum

from app.database import Base


# ───────────────────────────────────────────────────────────────
# ENUMS
# ───────────────────────────────────────────────────────────────

class JobStatus(str, enum.Enum):
    saved = "saved"
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"


# ───────────────────────────────────────────────────────────────
# USER
# ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)   # Admin: can manage all users
    ai_access = Column(Boolean, default=True)        # Controls access to AI features

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cvs = relationship("CV", back_populates="user", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="user", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")


# ───────────────────────────────────────────────────────────────
# CV MAIN TABLE
# ───────────────────────────────────────────────────────────────

class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Core Identity Fields
    full_name = Column(String(150))
    title = Column(String(255))
    email = Column(String(150))
    phone = Column(String(50))
    location = Column(String(150))
    linkedin_url = Column(Text)
    profile_summary = Column(Text)

    # Flexible JSON Sections
    personal_info = Column(JSONB, nullable=True)  # Editor format: {name, title, email, phone, location, linkedin, website, summary, photo}
    educations = Column(JSONB)
    experiences = Column(JSONB)
    projects = Column(JSONB)
    skills = Column(JSONB)
    languages = Column(JSONB)
    certifications = Column(JSONB)
    interests = Column(JSONB)
    custom_sections = Column(JSONB)   # [{title, content}]
    theme = Column(JSONB)             # {primaryColor, fontFamily, layout, accentStyle}

    # AI-ready metadata
    embedding = Column(JSONB, nullable=True)  # can replace with pgvector later

    # File Storage
    file_path = Column(String(500))
    photo_path = Column(String(500))
    original_text = Column(Text)

    # Versioning
    current_version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cvs")
    versions = relationship("CVVersion", back_populates="cv", cascade="all, delete-orphan")
    customizations = relationship("CVCustomization", back_populates="cv", cascade="all, delete-orphan")
    suggestions = relationship("Suggestion", back_populates="cv", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="cv")
    job_applications = relationship("JobApplication", back_populates="cv")

    __table_args__ = (
        Index("idx_cv_user_id", "user_id"),
    )


# ───────────────────────────────────────────────────────────────
# CV VERSIONING TABLE (CRITICAL FOR REVERT)
# ───────────────────────────────────────────────────────────────

class CVVersion(Base):
    __tablename__ = "cv_versions"

    id = Column(Integer, primary_key=True)
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=False)
    version_number = Column(Integer, nullable=False)

    snapshot = Column(JSONB, nullable=False)  # full CV snapshot

    created_at = Column(DateTime, default=datetime.utcnow)

    cv = relationship("CV", back_populates="versions")

    __table_args__ = (
        Index("idx_cv_version_lookup", "cv_id", "version_number"),
    )


# ───────────────────────────────────────────────────────────────
# AI CUSTOMIZATION
# ───────────────────────────────────────────────────────────────

class CVCustomization(Base):
    __tablename__ = "cv_customizations"

    id = Column(Integer, primary_key=True)
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=False)

    job_description = Column(Text, nullable=False)

    matched_keywords = Column(JSONB)
    missing_keywords = Column(JSONB)  # Missing keywords from job description
    customized_snapshot = Column(JSONB)

    ats_score = Column(Integer)
    similarity_score = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cv = relationship("CV", back_populates="customizations")
    suggestions = relationship("Suggestion", back_populates="customization")


# ───────────────────────────────────────────────────────────────
# SUGGESTIONS - ✅ FIXED VERSION
# ───────────────────────────────────────────────────────────────

class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True)

    cv_id = Column(Integer, ForeignKey("cvs.id"))
    customization_id = Column(Integer, ForeignKey("cv_customizations.id"), nullable=True)

    section = Column(String(50))  # e.g. education, experience, skills, projects
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    suggestion_text = Column(Text, nullable=False)
    
    # ✅ KEY FIX: Store the actual data structure to merge into CV
    # For experience: {job_title, company_name, location, responsibilities, ...}
    # For projects: {name, description, technologies, ...}
    # For skills: {programming: [...], cloud: [...], ...}
    # For education: {degree, institution_name, field_of_study, ...}
    suggestion_data = Column(JSONB, nullable=True)

    is_applied = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cv = relationship("CV", back_populates="suggestions")
    customization = relationship("CVCustomization", back_populates="suggestions")


# ───────────────────────────────────────────────────────────────
# COVER LETTER
# ───────────────────────────────────────────────────────────────

class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=True)

    title = Column(String(255), default="My Cover Letter", nullable=False)
    content = Column(JSONB, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cover_letters")
    cv = relationship("CV", back_populates="cover_letters")
    job_applications = relationship("JobApplication", back_populates="cover_letter")


# ───────────────────────────────────────────────────────────────
# JOB APPLICATION TRACKER
# ───────────────────────────────────────────────────────────────

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=True)
    cover_letter_id = Column(Integer, ForeignKey("cover_letters.id"), nullable=True)

    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    job_url = Column(String(1000))
    location = Column(String(255))
    salary_range = Column(String(100))

    status = Column(Enum(JobStatus), default=JobStatus.saved, nullable=False)
    applied_date = Column(DateTime)
    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="job_applications")
    cv = relationship("CV", back_populates="job_applications")
    cover_letter = relationship("CoverLetter", back_populates="job_applications")