#!/usr/bin/env python3
"""
Script to populate the CVs table with initial resume data.
Run this after creating the database tables.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, User, CV

# Create all tables if they don't exist
Base.metadata.create_all(bind=engine)

def populate_cv():
    """Populate the CVs table with resume data."""
    
    db: Session = SessionLocal()
    try:
        # Check if user exists (assuming user_id = 1 for admin/test user)
        # You might need to create a user first or use an existing user_id
        existing_user = db.query(User).filter(User.id == 1).first()
        
        if not existing_user:
            print("⚠️  Creating test user...")
            test_user = User(
                name="Ravindra Paudel",
                email="ravindra@example.com",
                hashed_password="hashed_test_password",  # This should be properly hashed in production
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            user_id = test_user.id
            print(f"✅ Test user created with id: {user_id}")
        else:
            user_id = existing_user.id
            print(f"✅ Using existing user with id: {user_id}")
        
        # Check if CV already exists for this user
        existing_cv = db.query(CV).filter(CV.user_id == user_id).first()
        if existing_cv:
            print(f"⚠️  CV already exists for user {user_id}. Skipping population.")
            return
        
        # Resume data structure
        resume_data = {
            "full_name": "Ravindra Paudel",
            "title": "Database Administrator & Software Developer",
            "email": "ravindra@example.com",
            "phone": "+977-9800000000",
            "location": "Kathmandu, Nepal",
            "linkedin_url": "https://linkedin.com/in/ravindrapaudel",
            "profile_summary": "Experienced Database Administrator and Software Developer with expertise in cloud platforms, database management systems, and backend development. Proficient in designing and maintaining complex database architectures and ETL pipelines.",
            
            # Education
            "educations": [
                {
                    "degree": "Masters Degree",
                    "field_of_study": "Philosophy and Computer Science",
                    "institution_name": "Universität Bayreuth",
                    "location": "Germany",
                    "start_date": "2025-10-01",
                    "end_date": None,
                    "status": "Present"
                },
                {
                    "degree": "B.Sc.",
                    "field_of_study": "Informatik und Informationstechnologie",
                    "institution_name": "Tribhuvan University",
                    "location": "Kathmandu, Nepal",
                    "start_date": "2017-10-01",
                    "end_date": "2021-12-01",
                    "final_project": "Offensive Content Detection System mit Naïve Bayes"
                }
            ],
            
            # Experience
            "experiences": [
                {
                    "job_title": "Datenbankadministrator",
                    "company_name": "Vanilla Transtechnor Pvt. Ltd.",
                    "location": "Kathmandu, Nepal",
                    "start_date": "2022-06-01",
                    "end_date": "2025-01-01",
                    "responsibilities": [
                        "Managed MS SQL Always On",
                        "MySQL Group Replication",
                        "PostgreSQL Streaming Replication",
                        "MongoDB Replica Sets",
                        "Designed ETL pipelines",
                        "Performance tuning",
                        "Collaboration with DevOps teams"
                    ]
                },
                {
                    "job_title": "Software Developer Praktikant",
                    "company_name": "Vanilla Transtechnor Pvt. Ltd.",
                    "location": "Kathmandu, Nepal",
                    "start_date": "2022-04-01",
                    "end_date": "2024-06-01",
                    "responsibilities": [
                        ".NET backend development",
                        "Vue.js & React.js frontend",
                        "Agile sprint participation"
                    ]
                }
            ],
            
            # Skills
            "skills": {
                "programming": ["Python", "SQL", "Bash", "C#", "ASP.NET", "JS", "PHP"],
                "cloud": ["AWS", "GCP", "Azure", "Docker"],
                "databases": ["MS SQL Server", "MySQL", "PostgreSQL", "MongoDB", "MariaDB"],
                "tools": ["Power BI", "Tableau", "Git", "Conda"],
                "management": ["Scrum", "Leadership", "Incident Management"]
            },
            
            # Languages
            "languages": [
                {"language": "Nepali", "level": "Native"},
                {"language": "German", "level": "B2"},
                {"language": "English", "level": "Professional"},
                {"language": "Hindi", "level": "Professional"}
            ],
            
            # Certifications (empty for now, can be added later)
            "certifications": []
        }
        
        # Create CV entry
        cv = CV(
            user_id=user_id,
            full_name=resume_data["full_name"],
            title=resume_data["title"],
            email=resume_data["email"],
            phone=resume_data["phone"],
            location=resume_data["location"],
            linkedin_url=resume_data["linkedin_url"],
            profile_summary=resume_data["profile_summary"],
            educations=resume_data["educations"],
            experiences=resume_data["experiences"],
            skills=resume_dafta["skills"],
            languages=resume_data["languages"],
            certifications=resume_data["certifications"],
            current_version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(cv)
        db.commit()
        db.refresh(cv)
        
        print("\n✅ CV successfully populated!")
        print(f"   CV ID: {cv.id}")
        print(f"   User ID: {cv.user_id}")
        print(f"   Name: {cv.full_name}")
        print(f"   Title: {cv.title}")
        print(f"   Created at: {cv.created_at}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error populating CV: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting CV population...")
    print("-" * 50)
    populate_cv()
    print("-" * 50)
    print("✨ Done!")
