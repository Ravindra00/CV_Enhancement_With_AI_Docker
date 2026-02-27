from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import User, JobApplication, JobStatus
from app.schemas import JobApplicationCreate, JobApplicationUpdate, JobApplicationResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/job-applications", tags=["job-applications"])


@router.get("", response_model=List[JobApplicationResponse])
def get_job_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all job applications for the user, optionally filtered by status."""
    query = db.query(JobApplication).filter(JobApplication.user_id == current_user.id)
    if status_filter:
        query = query.filter(JobApplication.status == status_filter)
    return query.order_by(JobApplication.updated_at.desc()).all()


@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get application counts per status for dashboard stats."""
    apps = db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    stats = {s.value: 0 for s in JobStatus}
    for app in apps:
        stats[app.status.value] += 1
    stats["total"] = len(apps)
    return stats


@router.get("/{app_id}", response_model=JobApplicationResponse)
def get_job_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found")
    return app


@router.post("", response_model=JobApplicationResponse)
def create_job_application(
    data: JobApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new job application entry."""
    app = JobApplication(
        user_id=current_user.id,
        company=data.company,
        role=data.role,
        job_url=data.job_url,
        location=data.location,
        salary_range=data.salary_range,
        status=data.status or JobStatus.saved,
        applied_date=data.applied_date,
        notes=data.notes,
        cv_id=data.cv_id,
        cover_letter_id=data.cover_letter_id,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.put("/{app_id}", response_model=JobApplicationResponse)
def update_job_application(
    app_id: int,
    data: JobApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a job application (including status change)."""
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(app, field, value)

    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return app


@router.patch("/{app_id}/status", response_model=JobApplicationResponse)
def update_status(
    app_id: int,
    new_status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick status update endpoint (for Kanban drag-drop)."""
    try:
        status_val = JobStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {[s.value for s in JobStatus]}")

    app = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found")

    app.status = status_val
    if status_val == JobStatus.applied and not app.applied_date:
        app.applied_date = datetime.utcnow()
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return app


@router.delete("/{app_id}")
def delete_job_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found")
    db.delete(app)
    db.commit()
    return {"message": "Job application deleted successfully"}
