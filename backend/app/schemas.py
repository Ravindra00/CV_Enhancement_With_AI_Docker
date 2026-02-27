from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, computed_field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


# ───────────────────────────────────────────────────────────────
# AUTH
# ───────────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool = False
    ai_access: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class SignupRequest(UserCreate):
    pass


class SignupResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# ───────────────────────────────────────────────────────────────
# CV SECTION MODELS (STRICT STRUCTURE)
# ───────────────────────────────────────────────────────────────

class EducationItem(BaseModel):
    degree: str
    field_of_study: Optional[str] = None
    institution_name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    final_project: Optional[str] = None


class ExperienceItem(BaseModel):
    job_title: str
    company_name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: Optional[List[str]] = []


class ProjectItem(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: Optional[List[str]] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    link: Optional[str] = None


class CertificationItem(BaseModel):
    name: str
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_url: Optional[str] = None


class LanguageItem(BaseModel):
    language: str
    level: str


class SkillsObject(BaseModel):
    programming: Optional[List[str]] = []
    cloud: Optional[List[str]] = []
    databases: Optional[List[str]] = []
    tools: Optional[List[str]] = []
    management: Optional[List[str]] = []


# ───────────────────────────────────────────────────────────────
# CV BASE
# ───────────────────────────────────────────────────────────────

class CVBase(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_summary: Optional[str] = None


class CVCreate(CVBase):
    personal_info: Optional[Dict[str, Any]] = None
    educations: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Union[Dict[str, Any], List[Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    interests: Optional[List[str]] = None


class CVUpdate(BaseModel):
    """Accepts frontend format: personal_info, experiences (position/company), educations (institution/degree), etc."""
    full_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_summary: Optional[str] = None
    personal_info: Optional[Dict[str, Any]] = None

    educations: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Union[Dict[str, Any], List[Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    interests: Optional[List[Any]] = None
    custom_sections: Optional[List[Dict[str, Any]]] = None
    theme: Optional[Dict[str, Any]] = None


class CVResponse(BaseModel):
    """Returns CV with all fields for editor/preview. JSON columns returned as-is for frontend compatibility."""
    id: int
    user_id: int
    full_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_summary: Optional[str] = None

    personal_info: Optional[Dict[str, Any]] = None
    educations: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Union[Dict[str, Any], List[Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    interests: Optional[List[Any]] = None
    custom_sections: Optional[List[Dict[str, Any]]] = None
    theme: Optional[Dict[str, Any]] = None

    file_path: Optional[str] = None
    photo_path: Optional[str] = None
    original_text: Optional[str] = None

    current_version: int = 1
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# class ApplyAIChangesRequest(BaseModel):
#     """Payload for applying AI-enhanced CV data back to the database."""
#     enhanced_cv: Dict[str, Any]

# ─── AI Changes Schema ──────────────────────────────────────────────────────

class ApplyAIChangesRequest(BaseModel):
    """Request to apply AI-enhanced CV data to the database."""
    enhanced_cv: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "enhanced_cv": {
                    "personal_info": {
                        "name": "Rabindra Pandey",
                        "email": "ravindrapandey2073@gmail.com",
                        "phone": "+49 15210893413",
                        "location": "Munich, Germany",
                        "linkedin": "linkedin.com/in/Rabindra",
                        "summary": "Enhanced professional summary..."
                    },
                    "experiences": [
                        {
                            "company": "TechCorp",
                            "position": "Senior DBA",
                            "startDate": "06/2022",
                            "endDate": "present",
                            "description": "Enhanced job description..."
                        }
                    ],
                    "educations": [],
                    "skills": [],
                    "certifications": [],
                    "languages": [],
                    "projects": []
                }
            }
        }

# ───────────────────────────────────────────────────────────────
# CV VERSION RESPONSE
# ───────────────────────────────────────────────────────────────

class CVVersionResponse(BaseModel):
    id: int
    cv_id: int
    version_number: int
    snapshot: dict
    created_at: datetime

    class Config:
        from_attributes = True


# ───────────────────────────────────────────────────────────────
# AI CUSTOMIZATION
# ───────────────────────────────────────────────────────────────

class CVCustomizationRequest(BaseModel):
    job_description: str


class CVCustomizationResponse(BaseModel):
    id: int
    cv_id: int
    job_description: str
    matched_keywords: Optional[dict] = None
    missing_keywords: Optional[dict] = None
    customized_snapshot: Optional[dict] = None
    ats_score: Optional[int] = None
    similarity_score: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ───────────────────────────────────────────────────────────────
# SUGGESTIONS - ✅ FIXED VERSION
# ───────────────────────────────────────────────────────────────

class SuggestionResponse(BaseModel):
    id: int
    cv_id: Optional[int] = None
    customization_id: Optional[int] = None
    section: Optional[str] = None
    title: str
    description: str
    suggestion_text: str
    
    # ✅ KEY FIX: Include the actual data to add
    suggestion_data: Optional[Dict[str, Any]] = None
    
    is_applied: bool = False
    created_at: datetime

    @computed_field
    @property
    def suggestion(self) -> str:
        """Alias for suggestion_text (frontend compatibility)."""
        return self.suggestion_text

    class Config:
        from_attributes = True


# ───────────────────────────────────────────────────────────────
# COVER LETTER
# ───────────────────────────────────────────────────────────────

class CoverLetterContent(BaseModel):
    recipient_name: Optional[str] = ""
    company: Optional[str] = ""
    role: Optional[str] = ""
    date: Optional[str] = ""
    opening: Optional[str] = ""
    body: Optional[str] = ""
    closing: Optional[str] = ""
    signature: Optional[str] = ""


class CoverLetterCreate(BaseModel):
    title: Optional[str] = "My Cover Letter"
    cv_id: Optional[int] = None
    content: Optional[CoverLetterContent] = None


class CoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    cv_id: Optional[int] = None
    content: Optional[Dict[str, Any]] = None


# class CoverLetterResponse(BaseModel):
#     id: int
#     user_id: int
#     cv_id: Optional[int] 
#     title: str
#     content: Optional[CoverLetterContent]
#     created_at: datetime
#     updated_at: datetime

#     class Config:
#         from_attributes = True

class CoverLetterResponse(BaseModel):
    id: int
    user_id: int
    cv_id: Optional[int] = None
    title: str
    content: Dict[str, Any]  # Full content object
    content_text: Optional[str] = None  # ✅ NEW: Extracted text for display
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_orm(cls, obj):
        """Extract text from content for easy frontend access"""
        # Get the full response data
        data = {
            'id': obj.id,
            'user_id': obj.user_id,
            'cv_id': obj.cv_id,
            'title': obj.title,
            'content': obj.content,  # Full object
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
        }
        
        # ✅ Extract text from content
        if isinstance(obj.content, dict) and 'text' in obj.content:
            data['content_text'] = obj.content['text']
        else:
            data['content_text'] = None
        
        # Create instance using parent's from_orm
        instance = super().from_orm(obj)
        instance.content_text = data['content_text']
        return instance
    
    class Config:
        from_attributes = True


# ───────────────────────────────────────────────────────────────
# JOB APPLICATION TRACKER
# ───────────────────────────────────────────────────────────────

class JobStatusEnum(str, Enum):
    saved = "saved"
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"


class JobApplicationCreate(BaseModel):
    company: str
    role: str
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[JobStatusEnum] = JobStatusEnum.saved
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    cv_id: Optional[int] = None
    cover_letter_id: Optional[int] = None


class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[JobStatusEnum] = None
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    cv_id: Optional[int] = None
    cover_letter_id: Optional[int] = None


class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    company: str
    role: str
    job_url: Optional[str]
    location: Optional[str]
    salary_range: Optional[str]
    status: JobStatusEnum
    applied_date: Optional[datetime]
    notes: Optional[str]
    cv_id: Optional[int]
    cover_letter_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True