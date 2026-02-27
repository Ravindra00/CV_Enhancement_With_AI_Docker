from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, CV, Suggestion, CVCustomization
from app.schemas import CVResponse, CVCreate, CVUpdate, CVCustomizationRequest, SuggestionResponse, ApplyAIChangesRequest
from app.dependencies import get_current_user
from app.utils.cv_parser import parse_cv_file
from app.utils.ai_integration import analyze_cv, enhance_cv_for_job, groq_enhance_sections
from app.utils.ai_enhance import extract_keywords, compute_match_score, rule_based_suggestions, groq_suggestions
from app.utils.pdf_generator import generate_cv_pdf
import os
import io
from datetime import datetime

router = APIRouter(prefix="/cvs", tags=["cvs"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _build_personal_info_from_flat(cv: CV) -> dict:
    """Build personal_info dict from flat columns when personal_info JSON is null."""
    return {
        'name': cv.full_name or '',
        'title': cv.title or '',
        'jobTitle': cv.title or '',
        'email': cv.email or '',
        'phone': cv.phone or '',
        'location': cv.location or '',
        'linkedin': cv.linkedin_url or '',
        'website': '',
        'summary': cv.profile_summary or '',
        'photo': cv.photo_path or '',
    }


def _get_personal_info(cv: CV) -> dict:
    """Get personal_info for response - from JSON column or build from flat cols.
    Preserves existing personal_info data and only fills missing fields from flat columns.
    """
    pi = getattr(cv, 'personal_info', None)
    if pi and isinstance(pi, dict):
        # Use existing personal_info, but fill missing fields from flat columns
        pi = dict(pi)
        # Only fill if not present (preserve user's data)
        if 'name' not in pi and cv.full_name:
            pi['name'] = cv.full_name
        if 'title' not in pi and cv.title:
            pi['title'] = cv.title
        if 'jobTitle' not in pi:
            pi['jobTitle'] = pi.get('title', cv.title or '')
        if 'email' not in pi and cv.email:
            pi['email'] = cv.email
        if 'phone' not in pi and cv.phone:
            pi['phone'] = cv.phone
        if 'location' not in pi and cv.location:
            pi['location'] = cv.location
        if 'linkedin' not in pi and cv.linkedin_url:
            pi['linkedin'] = cv.linkedin_url
        if 'summary' not in pi and cv.profile_summary:
            pi['summary'] = cv.profile_summary
        if 'photo' not in pi and cv.photo_path:
            pi['photo'] = cv.photo_path
        return pi
    # Build from flat columns if personal_info doesn't exist
    return _build_personal_info_from_flat(cv)


def _normalize_experience(exp):
    """Normalize experience object to frontend format. Preserves existing fields."""
    if not isinstance(exp, dict):
        return exp
    normalized = dict(exp)
    # Map backend field names to frontend format (preserve both if they exist)
    if 'job_title' in normalized:
        if 'role' not in normalized:
            normalized['role'] = normalized['job_title']
        if 'position' not in normalized:
            normalized['position'] = normalized['job_title']
    elif 'position' in normalized and 'role' not in normalized:
        normalized['role'] = normalized['position']
    elif 'role' in normalized and 'position' not in normalized:
        normalized['position'] = normalized['role']
    
    if 'company_name' in normalized and 'company' not in normalized:
        normalized['company'] = normalized['company_name']
    
    # Date field mapping - handle start_date, startDate, start_year
    if 'start_date' in normalized and 'startDate' not in normalized:
        normalized['startDate'] = normalized['start_date']
    elif 'start_year' in normalized and 'startDate' not in normalized:
        normalized['startDate'] = normalized['start_year']
    elif 'startDate' not in normalized:
        normalized['startDate'] = ''
    
    if 'end_date' in normalized and 'endDate' not in normalized:
        normalized['endDate'] = normalized['end_date']
    elif 'end_year' in normalized and 'endDate' not in normalized:
        normalized['endDate'] = normalized['end_year']
    elif 'endDate' not in normalized:
        normalized['endDate'] = ''
    
    if 'responsibilities' in normalized:
        resp = normalized.get('responsibilities', [])
        if isinstance(resp, list) and len(resp) > 0:
            # Convert responsibilities array to description string if description doesn't exist
            if 'description' not in normalized or not normalized.get('description'):
                normalized['description'] = '\n'.join([f"• {r}" if not r.startswith('•') else r for r in resp])
    
    return normalized


def _normalize_education(edu):
    """Normalize education object to frontend format. Handles various field name formats."""
    if not isinstance(edu, dict):
        return edu
    normalized = dict(edu)
    # Institution name mapping
    if 'institution_name' in normalized and 'institution' not in normalized:
        normalized['institution'] = normalized['institution_name']
    # Field of study mapping
    if 'field_of_study' in normalized and 'field' not in normalized:
        normalized['field'] = normalized['field_of_study']
    # Date field mapping - handle start_date, startDate, start_year
    if 'start_date' in normalized and 'startDate' not in normalized:
        normalized['startDate'] = normalized['start_date']
    elif 'start_year' in normalized and 'startDate' not in normalized:
        normalized['startDate'] = normalized['start_year']
    elif 'startDate' not in normalized and 'start_date' not in normalized and 'start_year' not in normalized:
        normalized['startDate'] = ''
    # End date mapping
    if 'end_date' in normalized and 'endDate' not in normalized:
        normalized['endDate'] = normalized['end_date']
    elif 'end_year' in normalized and 'endDate' not in normalized:
        normalized['endDate'] = normalized['end_year']
    elif 'endDate' not in normalized and 'end_date' not in normalized and 'end_year' not in normalized:
        normalized['endDate'] = ''
    return normalized


def _normalize_certification(cert):
    """Normalize certification object to frontend format."""
    if not isinstance(cert, dict):
        return cert
    normalized = dict(cert)
    if 'issue_date' in normalized and 'issueDate' not in normalized:
        normalized['issueDate'] = normalized.pop('issue_date')
    if 'expiry_date' in normalized and 'expiryDate' not in normalized:
        normalized['expiryDate'] = normalized.pop('expiry_date')
    if 'credential_url' in normalized and 'credentialUrl' not in normalized:
        normalized['credentialUrl'] = normalized.pop('credential_url')
    return normalized


def _cv_to_response(cv: CV) -> dict:
    """Build complete CV response dict with all fields for frontend. Handles JSON columns properly."""
    # Normalize arrays to frontend format
    experiences = []
    if cv.experiences:
        exp_list = cv.experiences if isinstance(cv.experiences, list) else []
        experiences = [_normalize_experience(exp) for exp in exp_list]
    
    educations = []
    if cv.educations:
        edu_list = cv.educations if isinstance(cv.educations, list) else []
        educations = [_normalize_education(edu) for edu in edu_list]
    
    certifications = []
    if cv.certifications:
        cert_list = cv.certifications if isinstance(cv.certifications, list) else []
        certifications = [_normalize_certification(cert) for cert in cert_list]
    
    # Handle languages - ensure consistent format
    languages = []
    if cv.languages:
        lang_list = cv.languages if isinstance(cv.languages, list) else []
        languages = lang_list
    
    # Handle projects - ensure link/url compatibility
    projects = []
    if cv.projects:
        proj_list = cv.projects if isinstance(cv.projects, list) else []
        projects = []
        for proj in proj_list:
            if isinstance(proj, dict):
                normalized_proj = dict(proj)
                # Ensure both link and url exist for compatibility
                if 'link' in normalized_proj and 'url' not in normalized_proj:
                    normalized_proj['url'] = normalized_proj['link']
                elif 'url' in normalized_proj and 'link' not in normalized_proj:
                    normalized_proj['link'] = normalized_proj['url']
                projects.append(normalized_proj)
            else:
                projects.append(proj)
    
    return {
        'id': cv.id,
        'user_id': cv.user_id,
        'full_name': cv.full_name,
        'title': cv.title,
        'email': cv.email,
        'phone': cv.phone,
        'location': cv.location,
        'linkedin_url': cv.linkedin_url,
        'profile_summary': cv.profile_summary,
        'personal_info': _get_personal_info(cv),
        'educations': educations,
        'experiences': experiences,
        'projects': projects,
        'skills': cv.skills if cv.skills is not None else [],
        'languages': languages,
        'certifications': certifications,
        'interests': cv.interests if cv.interests is not None else [],
        'custom_sections': getattr(cv, 'custom_sections', None) or [],
        'theme': getattr(cv, 'theme', None) or {},
        'file_path': cv.file_path,
        'photo_path': cv.photo_path,
        'original_text': cv.original_text,
        'current_version': cv.current_version or 1,
        'is_active': cv.is_active if cv.is_active is not None else True,
        'created_at': cv.created_at,
        'updated_at': cv.updated_at,
    }



def _build_cv_data_dict(cv: CV) -> dict:
    """Build a unified CV data dict from the ORM model for AI functions."""
    return {
        'full_name': cv.full_name,
        'email': cv.email,
        'phone': cv.phone,
        'location': cv.location,
        'linkedin_url': cv.linkedin_url,
        'profile_summary': cv.profile_summary,
        'experiences': cv.experiences or [],
        'educations': cv.educations or [],
        'skills': cv.skills or [],
        'certifications': cv.certifications or [],
        'languages': cv.languages or [],
        'projects': cv.projects or [],
        'personal_info': _get_personal_info(cv),
    }


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CVResponse])
def get_all_cvs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all CVs for the current user with all fields properly serialized."""
    cvs = db.query(CV).filter(CV.user_id == current_user.id).order_by(CV.updated_at.desc()).all()
    return [_cv_to_response(cv) for cv in cvs]


@router.get("/{cv_id}", response_model=CVResponse)
def get_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific CV by ID with all fields for editor/preview."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return _cv_to_response(cv)


@router.post("", response_model=CVResponse)
def create_cv(
    cv_data: CVCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new (blank) CV."""
    pi = cv_data.personal_info or {}
    new_cv = CV(
        user_id=current_user.id,
        title=cv_data.title or pi.get('title') or pi.get('jobTitle') or "My CV",
        full_name=cv_data.full_name or pi.get('name'),
        email=cv_data.email or pi.get('email'),
        phone=cv_data.phone or pi.get('phone'),
        location=cv_data.location or pi.get('location'),
        linkedin_url=cv_data.linkedin_url or pi.get('linkedin'),
        profile_summary=cv_data.profile_summary or pi.get('summary'),
        personal_info=pi if pi else None,
        educations=cv_data.educations if cv_data.educations is not None else [],
        experiences=cv_data.experiences if cv_data.experiences is not None else [],
        projects=cv_data.projects if cv_data.projects is not None else [],
        skills=cv_data.skills if cv_data.skills is not None else [],
        languages=cv_data.languages if cv_data.languages is not None else [],
        certifications=cv_data.certifications if cv_data.certifications is not None else [],
        interests=cv_data.interests if cv_data.interests is not None else [],
        current_version=1,
    )
    db.add(new_cv)
    db.commit()
    db.refresh(new_cv)
    return _cv_to_response(new_cv)


@router.put("/{cv_id}", response_model=CVResponse)
def update_cv(
    cv_id: int,
    cv_data: CVUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a CV. Accepts frontend format (personal_info, experiences with position/company, etc).
    JSON columns are stored as-is. Flat columns are synced from personal_info when provided.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # personal_info from editor — store and sync to flat cols
    if cv_data.personal_info is not None:
        # Store personal_info as-is (preserve all fields)
        cv.personal_info = cv_data.personal_info
        pi = cv_data.personal_info
        # Sync flat columns from personal_info (only if provided, don't overwrite with None)
        if 'name' in pi:
            cv.full_name = pi.get('name') or cv.full_name
        if 'email' in pi:
            cv.email = pi.get('email') or cv.email
        if 'phone' in pi:
            cv.phone = pi.get('phone') or cv.phone
        if 'location' in pi:
            cv.location = pi.get('location') or cv.location
        if 'linkedin' in pi:
            cv.linkedin_url = pi.get('linkedin') or cv.linkedin_url
        if 'summary' in pi:
            cv.profile_summary = pi.get('summary') or cv.profile_summary
        # Handle title/jobTitle
        if 'title' in pi or 'jobTitle' in pi:
            cv.title = pi.get('title') or pi.get('jobTitle') or cv.title

    # Flat field overrides
    if cv_data.title is not None:
        cv.title = cv_data.title
    if cv_data.full_name is not None:
        cv.full_name = cv_data.full_name
    if cv_data.email is not None:
        cv.email = cv_data.email
    if cv_data.phone is not None:
        cv.phone = cv_data.phone
    if cv_data.location is not None:
        cv.location = cv_data.location
    if cv_data.linkedin_url is not None:
        cv.linkedin_url = cv_data.linkedin_url
    if cv_data.profile_summary is not None:
        cv.profile_summary = cv_data.profile_summary

    # JSON sections — store as-is (list/dict from frontend)
    # Frontend sends data in its format, we store it directly
    if cv_data.educations is not None:
        cv.educations = cv_data.educations
    if cv_data.experiences is not None:
        # Frontend sends experiences with position/role, store as-is
        cv.experiences = cv_data.experiences
    if cv_data.projects is not None:
        cv.projects = cv_data.projects
    if cv_data.skills is not None:
        cv.skills = cv_data.skills
    if cv_data.languages is not None:
        cv.languages = cv_data.languages
    if cv_data.certifications is not None:
        cv.certifications = cv_data.certifications
    if cv_data.interests is not None:
        cv.interests = cv_data.interests
    if cv_data.custom_sections is not None:
        cv.custom_sections = cv_data.custom_sections
    if cv_data.theme is not None:
        cv.theme = cv_data.theme


    cv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cv)
    return _cv_to_response(cv)


@router.delete("/{cv_id}")
def delete_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a CV and all linked records."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    db.delete(cv)
    db.commit()
    return {"message": "CV deleted successfully"}


# ── File upload ────────────────────────────────────────────────────────────────

@router.post("/{cv_id}/upload", response_model=CVResponse)
def upload_cv_file(
    cv_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF/DOCX file, parse it, and populate all CV columns.
    Also builds personal_info so the editor loads the data correctly.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    try:
        file_path = os.path.join(UPLOAD_DIR, f"{cv_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file.file.read())

        parsed_data = parse_cv_file(file_path)

        # --- Flat fields ---
        cv.title = os.path.splitext(file.filename)[0]
        cv.file_path = file_path
        cv.original_text = parsed_data.get('original_text', '')

        cv.full_name = parsed_data.get('full_name') or parsed_data.get('personalInfo', {}).get('name', '')
        cv.email = parsed_data.get('email') or parsed_data.get('personalInfo', {}).get('email', '')
        cv.phone = parsed_data.get('phone') or parsed_data.get('personalInfo', {}).get('phone', '')
        cv.location = parsed_data.get('location') or parsed_data.get('personalInfo', {}).get('location', '')
        cv.linkedin_url = parsed_data.get('linkedin_url') or parsed_data.get('personalInfo', {}).get('linkedin', '')
        cv.profile_summary = parsed_data.get('profile_summary') or parsed_data.get('personalInfo', {}).get('summary', '')

        # --- JSON sections ---
        cv.educations = parsed_data.get('education') or parsed_data.get('educations', [])
        cv.experiences = parsed_data.get('experience') or parsed_data.get('experiences', [])
        cv.skills = parsed_data.get('skills', [])
        cv.certifications = parsed_data.get('certifications', [])
        cv.languages = parsed_data.get('languages', [])
        cv.projects = parsed_data.get('projects', [])

        # FIX: build personal_info so the editor gets a fully-populated object
        cv.personal_info = {
            'name': cv.full_name or '',
            'title': cv.title or '',
            'email': cv.email or '',
            'phone': cv.phone or '',
            'location': cv.location or '',
            'linkedin': cv.linkedin_url or '',
            'website': parsed_data.get('website', ''),
            'summary': cv.profile_summary or '',
            'photo': cv.photo_path or '',
        }

        cv.current_version = (cv.current_version or 0) + 1
        cv.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(cv)
        return _cv_to_response(cv)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse CV file: {str(e)}"
        )


@router.post("/{cv_id}/photo")
def upload_photo(
    cv_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile photo for a CV."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    photo_dir = os.path.join(UPLOAD_DIR, "photos")
    os.makedirs(photo_dir, exist_ok=True)
    safe_filename = f"{cv_id}_{file.filename}"
    photo_path_fs = os.path.join(photo_dir, safe_filename)
    with open(photo_path_fs, "wb") as f:
        f.write(file.file.read())

    # Store URL-accessible path so the frontend can display it directly
    photo_url = f"/uploads/photos/{safe_filename}"
    cv.photo_path = photo_url
    pi = _get_personal_info(cv)
    pi['photo'] = photo_url
    cv.personal_info = pi
    cv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cv)
    return {"photo_path": photo_url}


@router.get("/{cv_id}/export/pdf")
def export_cv_pdf(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and return a PDF version of the CV using stored theme."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    try:
        pi = _get_personal_info(cv)
        theme = (cv.theme if isinstance(getattr(cv, 'theme', None), dict) else None) or {}

        cv_data_for_pdf = {
            'personalInfo': pi,
            'summary': pi.get('summary') or cv.profile_summary or '',
            'experience': cv.experiences or [],
            'education': cv.educations or [],
            'skills': cv.skills or [],
            'certifications': cv.certifications or [],
            'languages': cv.languages or [],
            'projects': cv.projects or [],
            'interests': cv.interests or [],
            'custom_sections': (
                getattr(cv, 'custom_sections', None) or []
            ),
        }

        pdf_bytes = generate_cv_pdf(cv_data_for_pdf, title=cv.title or 'CV', theme=theme)

        filename = (cv.title or 'CV').replace(' ', '_') + '.pdf'
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type='application/pdf',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}"
        )


# ── AI endpoints ───────────────────────────────────────────────────────────────

@router.post("/{cv_id}/analyze")
def analyze_cv_endpoint(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze CV with Groq and return strengths, improvements, score."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    cv_data = _build_cv_data_dict(cv)
    result = analyze_cv(cv_data)
    return result


@router.post("/{cv_id}/customize")
def customize_cv(
    cv_id: int,
    request: CVCustomizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze CV against a job description.
    Returns a keyword match score, matched/missing keywords, and AI suggestions.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    cv_data = _build_cv_data_dict(cv)
    job_desc = request.job_description

    # ── keyword analysis ──────────────────────────────────────────────────────
    # Build a text blob from the CV to extract its keywords
    cv_text_parts = [
        cv.full_name or '',
        cv.profile_summary or '',
        ' '.join([e.get('description', '') or ' '.join(e.get('responsibilities', [])) for e in (cv.experiences or [])]),
        ' '.join([s if isinstance(s, str) else s.get('name', '') for s in (cv.skills or [])]),
    ]
    cv_text = ' '.join(cv_text_parts)
    cv_keywords = extract_keywords(cv_text)
    jd_keywords = extract_keywords(job_desc)
    score, matched, missing = compute_match_score(cv_keywords, jd_keywords)

    # ── AI suggestions (Groq) with rule-based fallback ────────────────────────
    suggestions_data = groq_suggestions(cv_data, job_desc, missing, score)
    if not suggestions_data:
        suggestions_data = rule_based_suggestions(cv_data, job_desc, missing, score)

    # ── Persist customization record ──────────────────────────────────────────
    customization = CVCustomization(
        cv_id=cv_id,
        job_description=job_desc,
        matched_keywords=matched,
        missing_keywords=missing,
        ats_score=score,
        similarity_score=score,
    )
    db.add(customization)
    db.flush()   # get customization.id

    db_suggestions = []
    for s in suggestions_data:
        obj = Suggestion(
            cv_id=cv_id,
            customization_id=customization.id,
            title=s['title'],
            description=s['description'],
            suggestion_text=s.get('suggestion', ''),
            section=s.get('section', 'general'),
        )
        db.add(obj)
        db_suggestions.append(obj)

    db.commit()
    db.refresh(customization)
    for obj in db_suggestions:
        db.refresh(obj)

    return {
        "id": customization.id,
        "cv_id": cv_id,
        "score": score,
        "matched_keywords": matched[:20],
        "missing_keywords": missing[:20],
        "suggestions": [SuggestionResponse.from_orm(s) for s in db_suggestions],
    }


@router.post("/{cv_id}/enhance-for-job")
def enhance_cv_for_job_endpoint(
    cv_id: int,
    request: CVCustomizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Use Groq AI to regenerate the three ATS-critical sections of the CV
    (experiences, projects, skills) based on the job description.
    Personal info, certifications, languages and interests are NOT changed.

    Returns the enhanced CV data — call /apply-ai-changes to persist.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    cv_data = _build_cv_data_dict(cv)

    # Use the same Groq client/model pattern as cover letter generation
    result = groq_enhance_sections(cv_data, request.job_description)

    success = result.get('status') == 'success'
    return {
        "status": result.get('status', 'error'),
        "enhanced_cv": result.get('enhanced_cv', cv_data),
        "message": (
            "AI enhancement complete. Call /apply-ai-changes to save."
            if success else
            "AI enhancement unavailable — original CV data returned."
        ),
    }


# @router.post("/{cv_id}/apply-ai-changes", response_model=CVResponse)
# def apply_ai_changes(
#     cv_id: int,
#     request: ApplyAIChangesRequest,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """
#     FIX: NEW ENDPOINT
#     Apply AI-enhanced CV data back to the database.
#     The frontend calls enhance-for-job → user reviews → calls this to save.
#     """
#     cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
#     if not cv:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

#     enhanced = request.enhanced_cv

#     # Update all sections from the enhanced payload
#     if 'personal_info' in enhanced:
#         cv.personal_info = enhanced['personal_info']
#         pi = enhanced['personal_info']
#         cv.full_name = pi.get('name') or cv.full_name
#         cv.email = pi.get('email') or cv.email
#         cv.phone = pi.get('phone') or cv.phone
#         cv.location = pi.get('location') or cv.location
#         cv.linkedin_url = pi.get('linkedin') or cv.linkedin_url
#         cv.profile_summary = pi.get('summary') or cv.profile_summary

#     if 'profile_summary' in enhanced:
#         cv.profile_summary = enhanced['profile_summary']
#     if 'experiences' in enhanced:
#         cv.experiences = enhanced['experiences']
#     if 'educations' in enhanced:
#         cv.educations = enhanced['educations']
#     if 'skills' in enhanced:
#         cv.skills = enhanced['skills']
#     if 'certifications' in enhanced:
#         cv.certifications = enhanced['certifications']
#     if 'languages' in enhanced:
#         cv.languages = enhanced['languages']
#     if 'projects' in enhanced:
#         cv.projects = enhanced['projects']

#     cv.current_version = (cv.current_version or 1) + 1
#     cv.updated_at = datetime.utcnow()

#     db.commit()
#     db.refresh(cv)
#     return _cv_to_response(cv)


@router.post("/{cv_id}/apply-ai-changes", response_model=CVResponse)
def apply_ai_changes(
    cv_id: int,
    request: ApplyAIChangesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply AI-enhanced CV data back to the database.
    The frontend calls enhance-for-job → user reviews → calls this to save.
    
    ✅ FIXED: Proper error handling, no data loss, updates personal_info correctly
    """
    try:
        cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
        if not cv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

        enhanced = request.enhanced_cv
        
        # Validate enhanced is a dict
        if not isinstance(enhanced, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="enhanced_cv must be a dictionary"
            )

        # ── Update personal_info section ──────────────────────────────────────
        if 'personal_info' in enhanced and isinstance(enhanced['personal_info'], dict):
            pi = enhanced['personal_info']
            
            # Store the entire personal_info object (preserves all fields)
            cv.personal_info = pi
            
            # Sync flat columns from personal_info (use direct assignment, not 'or')
            # This allows updating to None or empty string
            if 'name' in pi:
                cv.full_name = pi.get('name')
            if 'email' in pi:
                cv.email = pi.get('email')
            if 'phone' in pi:
                cv.phone = pi.get('phone')
            if 'location' in pi:
                cv.location = pi.get('location')
            if 'linkedin' in pi:
                cv.linkedin_url = pi.get('linkedin')
            if 'summary' in pi:
                cv.profile_summary = pi.get('summary')
            if 'title' in pi or 'jobTitle' in pi:
                cv.title = pi.get('title') or pi.get('jobTitle') or cv.title

        # ── Update profile_summary (if provided separately) ─────────────────────
        if 'profile_summary' in enhanced:
            cv.profile_summary = enhanced['profile_summary']

        # ── Update JSON array sections ──────────────────────────────────────────
        # Store directly without type checking (preserve whatever format frontend sends)
        if 'experiences' in enhanced:
            cv.experiences = enhanced['experiences'] if enhanced['experiences'] else []
        
        if 'educations' in enhanced:
            cv.educations = enhanced['educations'] if enhanced['educations'] else []
        
        if 'skills' in enhanced:
            cv.skills = enhanced['skills'] if enhanced['skills'] else []
        
        if 'certifications' in enhanced:
            cv.certifications = enhanced['certifications'] if enhanced['certifications'] else []
        
        if 'languages' in enhanced:
            cv.languages = enhanced['languages'] if enhanced['languages'] else []
        
        if 'projects' in enhanced:
            cv.projects = enhanced['projects'] if enhanced['projects'] else []

        # ── Update version & timestamp ──────────────────────────────────────────
        cv.current_version = (cv.current_version or 1) + 1
        cv.updated_at = datetime.utcnow()

        # ── Commit to database ──────────────────────────────────────────────────
        db.commit()
        db.refresh(cv)
        
        return _cv_to_response(cv)
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, not found, etc)
        raise
    except Exception as e:
        # Catch unexpected errors and return informative response
        db.rollback()
        import traceback
        error_detail = f"Failed to apply changes: {str(e)}"
        print(f"Error in apply_ai_changes: {error_detail}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )

# ── Suggestions ───────────────────────────────────────────────────────────────

@router.get("/{cv_id}/suggestions", response_model=List[SuggestionResponse])
def get_suggestions(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return db.query(Suggestion).filter(Suggestion.cv_id == cv_id).order_by(Suggestion.created_at.desc()).all()


# ════════════════════════════════════════════════════════════════════════════════════
# CRITICAL FIX: apply_suggestion endpoint (UPDATED)
# ════════════════════════════════════════════════════════════════════════════════════
# Replace the endpoint in backend/app/routes/cvs.py (lines 779-802) with this:
# This version REPLACES original content instead of appending when suggestion_data exists

@router.post("/{cv_id}/suggestions/{suggestion_id}/apply")
def apply_suggestion(
    cv_id: int,
    suggestion_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ FIXED: Apply a suggestion by merging/replacing its data into the CV.
    
    KEY BEHAVIOR:
    - If suggestion has suggestion_data (actual enhanced content), use it
    - For experience/projects: REPLACE the original item with enhanced version
    - For skills/languages: APPEND or MERGE into existing
    - This allows users to overwrite with better versions
    
    This endpoint:
    1. Gets the suggestion with its suggestion_data
    2. For experience: REPLACES the matching original entry
    3. For other sections: Merges or appends appropriately
    4. Marks the suggestion as applied
    5. Returns the UPDATED CV data so frontend can update the preview
    """
    
    # Step 1: Verify CV ownership
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Step 2: Get the suggestion with its data
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.cv_id == cv_id
    ).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    # Step 3: Apply suggestion data to CV ✅ THIS IS THE CRITICAL PART
    try:
        section = suggestion.section
        suggestion_data = suggestion.suggestion_data
        
        if not suggestion_data:
            # If no data, just mark as applied
            print(f"⚠️ Suggestion {suggestion_id} has no suggestion_data to merge")
            suggestion.is_applied = True
            suggestion.updated_at = datetime.utcnow()
            db.commit()
            return {
                "message": "Suggestion marked as applied (no data to merge)",
                "suggestion": SuggestionResponse.from_orm(suggestion)
            }
        
        print(f"📝 Applying {section} suggestion to CV {cv_id}")
        print(f"   Suggestion data: {suggestion_data}")
        
        # ✅ REPLACE strategy for experience (most common case)
        if section == "experience":
            if cv.experiences is None:
                cv.experiences = []
            if not isinstance(cv.experiences, list):
                cv.experiences = []
            
            # Strategy: REPLACE the first/most recent experience with the enhanced version
            # This allows users to improve their current role's description
            if cv.experiences:
                print(f"✅ REPLACING first experience entry with enhanced version")
                print(f"   Old: {cv.experiences[0].get('role', 'Unknown')}")
                print(f"   New: {suggestion_data.get('role', 'Unknown')}")
                cv.experiences[0] = suggestion_data
            else:
                # If no experiences, just add
                print(f"✅ Adding new experience (no existing entries)")
                cv.experiences.append(suggestion_data)
            
        elif section == "projects":
            if cv.projects is None:
                cv.projects = []
            if not isinstance(cv.projects, list):
                cv.projects = []
            
            # For projects: also REPLACE first one
            if cv.projects:
                print(f"✅ REPLACING first project with enhanced version")
                cv.projects[0] = suggestion_data
            else:
                print(f"✅ Adding new project (no existing entries)")
                cv.projects.append(suggestion_data)
            
        elif section == "education":
            if cv.educations is None:
                cv.educations = []
            if not isinstance(cv.educations, list):
                cv.educations = []
            
            # For education: REPLACE first one if exists
            if cv.educations:
                print(f"✅ REPLACING first education with enhanced version")
                cv.educations[0] = suggestion_data
            else:
                print(f"✅ Adding new education (no existing entries)")
                cv.educations.append(suggestion_data)
            
        elif section == "skills":
            if cv.skills is None:
                cv.skills = {}
            if not isinstance(cv.skills, dict):
                cv.skills = {}
            
            # For skills: MERGE by category (avoid duplicates)
            if isinstance(suggestion_data, dict):
                for category, skills_list in suggestion_data.items():
                    if category not in cv.skills:
                        cv.skills[category] = []
                    if not isinstance(cv.skills[category], list):
                        cv.skills[category] = []
                    
                    # Add new skills, avoiding duplicates
                    existing_skills = set(cv.skills[category])
                    for skill in skills_list:
                        if skill not in existing_skills:
                            cv.skills[category].append(skill)
                
                print(f"✅ Merged skills: {suggestion_data}")
        
        elif section == "languages":
            if cv.languages is None:
                cv.languages = []
            if not isinstance(cv.languages, list):
                cv.languages = []
            
            # For languages: APPEND (usually different languages)
            print(f"✅ Added language: {suggestion_data.get('language', 'Unknown')}")
            cv.languages.append(suggestion_data)
        
        elif section == "certifications":
            if cv.certifications is None:
                cv.certifications = []
            if not isinstance(cv.certifications, list):
                cv.certifications = []
            
            # For certifications: APPEND
            print(f"✅ Added certification: {suggestion_data.get('name', 'Unknown')}")
            cv.certifications.append(suggestion_data)
        
        else:
            # Unknown section, just mark as applied
            print(f"⚠️ Unknown section: {section}")
        
        # Step 4: Mark suggestion as applied and update timestamp
        suggestion.is_applied = True
        suggestion.updated_at = datetime.utcnow()
        
        # Step 5: Update CV timestamp and version
        cv.updated_at = datetime.utcnow()
        cv.current_version = (cv.current_version or 1) + 1
        
        # Step 6: Commit to database
        db.add(cv)
        db.add(suggestion)
        db.commit()
        db.refresh(cv)
        db.refresh(suggestion)
        
        print(f"✅ Suggestion applied successfully!")
        
        # Step 7: Return BOTH the updated suggestion AND the updated CV
        # ✅ Frontend needs the updated CV data to update the preview!
        return {
            "message": "Suggestion applied successfully",
            "suggestion": SuggestionResponse.from_orm(suggestion),
            "updated_cv": cv  # ← CRITICAL: Return the updated CV
        }
        
    except Exception as e:
        db.rollback()
        import traceback
        print(f"❌ Error applying suggestion: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply suggestion: {str(e)}"
        )

# ════════════════════════════════════════════════════════════════════════════════════
# END OF FIXED ENDPOINT
# ════════════════════════════════════════════════════════════════════════════════════


