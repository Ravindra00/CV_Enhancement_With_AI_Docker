from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel, HttpUrl
from app.database import get_db
from app.models import User, CoverLetter, CV
from app.schemas import CoverLetterCreate, CoverLetterUpdate, CoverLetterResponse
from app.dependencies import get_current_user
from app.utils.ai_integration import generate_cover_letter, extract_job_description

router = APIRouter(prefix="/cover-letters", tags=["cover-letters"])

# Schema for AI generation
class GenerateCoverLetterRequest(BaseModel):
    cv_id: int
    job_description: str
    title: str = "AI Generated Cover Letter"

class ExtractJobDescriptionRequest(BaseModel):
    url: str


@router.get("", response_model=List[CoverLetterResponse])
def get_cover_letters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all cover letters for the current user."""
    return db.query(CoverLetter).filter(CoverLetter.user_id == current_user.id).order_by(CoverLetter.updated_at.desc()).all()

@router.get("/{cl_id}", response_model=CoverLetterResponse)
def get_cover_letter(
    cl_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single cover letter by ID."""
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == current_user.id).first()
    if not cl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")
    return cl


@router.post("", response_model=CoverLetterResponse)
def create_cover_letter(
    data: CoverLetterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new cover letter."""
    cl = CoverLetter(
        user_id=current_user.id,
        cv_id=data.cv_id,
        title=data.title or "My Cover Letter",
        content=data.content or {}
    )
    db.add(cl)
    db.commit()
    db.refresh(cl)
    return cl


@router.put("/{cl_id}", response_model=CoverLetterResponse)
def update_cover_letter(
    cl_id: int,
    data: CoverLetterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a cover letter."""
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == current_user.id).first()
    if not cl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")
    if data.title is not None:
        cl.title = data.title
    if data.cv_id is not None:
        cl.cv_id = data.cv_id
    if data.content is not None:
        cl.content = data.content
    cl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cl)
    return cl


@router.delete("/{cl_id}")
def delete_cover_letter(
    cl_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a cover letter."""
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == current_user.id).first()
    if not cl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")
    db.delete(cl)
    db.commit()
    return {"message": "Cover letter deleted successfully"}


@router.post("/generate-with-ai")
def generate_with_ai(
    request: GenerateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ FIXED: Generate a cover letter using AI and SAVE it to database
    """
    try:
        print(f"\n{'='*70}")
        print(f"📝 [generate_with_ai] Starting...")
        print(f"{'='*70}")
        print(f"   User ID: {current_user.id}")
        print(f"   CV ID: {request.cv_id}")
        print(f"   Title: {request.title}")
        
        # ✅ Get CV
        cv = db.query(CV).filter(CV.id == request.cv_id, CV.user_id == current_user.id).first()
        if not cv:
            print(f"❌ CV not found for ID {request.cv_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
        
        print(f"✅ CV found: {cv.full_name}")
        
        # ✅ Build CV data for AI
        cv_data = {
            'full_name': cv.full_name,
            'experiences': cv.experiences or [],
            'skills': cv.skills or [],
            'educations': cv.educations or [],
            'projects': cv.projects or [],
            'certifications': cv.certifications or [],
            'languages': cv.languages or [],
            'interests': cv.interests or [],
            'summary': cv.profile_summary or "",
        }
        
        print(f"✅ CV data built: {len(cv_data)} fields")
        
        # ✅ Generate cover letter with AI
        print(f"🤖 Calling generate_cover_letter()...")
        content = generate_cover_letter(cv_data, request.job_description, current_user.name)
        
        if not content:
            print(f"❌ AI generation returned empty content")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="AI generation failed"
            )
        
        print(f"✅ Generated content: {len(content)} chars")
        
        # ✅ Create database record
        print(f"💾 Creating database record...")
        cl = CoverLetter(
            user_id=current_user.id,
            cv_id=request.cv_id,
            title=request.title,
            content={
                "text": content,
                "generated_with_ai": True,
                "job_description": request.job_description[:500],  # Store first 500 chars
                "created_at": datetime.utcnow().isoformat()
            }
        )
        
        print(f"   CoverLetter object created")
        print(f"   user_id: {cl.user_id}")
        print(f"   cv_id: {cl.cv_id}")
        print(f"   title: {cl.title}")
        print(f"   content.text length: {len(cl.content['text'])}")
        
        # ✅ Add to session
        db.add(cl)
        print(f"✅ Added to session")
        
        # ✅ Commit to database
        db.commit()
        print(f"✅ COMMITTED to database")
        
        # ✅ Refresh to get the ID
        db.refresh(cl)
        print(f"✅ Refreshed from database")
        print(f"   Saved with ID: {cl.id}")
        
        # ✅ Verify it was saved
        verify = db.query(CoverLetter).filter(CoverLetter.id == cl.id).first()
        if verify:
            print(f"✅ VERIFIED: Record exists in database!")
            print(f"   ID: {verify.id}")
            print(f"   Title: {verify.title}")
            print(f"   Content length: {len(verify.content.get('text', ''))}")
        else:
            print(f"❌ ERROR: Record NOT found in database after save!")
        
        # ✅ Return response
        print(f"\n✅ Returning response...")
        response = CoverLetterResponse.from_orm(cl)
        print(f"{'='*70}\n")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        db.rollback()
        raise
    except Exception as e:
        print(f"\n❌ ERROR in generate_with_ai:")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # ✅ IMPORTANT: Rollback on error
        db.rollback()
        print(f"   Database rolled back")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Cover letter generation failed: {str(e)}"
        )


@router.post("/extract-job-from-url")
def extract_job_from_url(
    request: ExtractJobDescriptionRequest,
    current_user: User = Depends(get_current_user)
):
    """Extract job description from a URL"""
    try:
        print(f"\n🔗 Extracting from URL: {request.url}")
        job_desc = extract_job_description(request.url)
        
        if not job_desc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Could not extract job description"
            )
        
        print(f"✅ Extracted: {len(job_desc)} chars")
        return {"job_description": job_desc, "url": request.url}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )