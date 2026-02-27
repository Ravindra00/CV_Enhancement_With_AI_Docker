import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/cv_enhancer"
)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# API Configuration
API_TITLE = "CV Enhancer API"
API_VERSION = "1.0.0"
API_DESCRIPTION = "API for CV Enhancement and AI-powered customization"

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3001",
]

# Upload Configuration
UPLOAD_DIRECTORY = "uploads"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

# AI Model Configuration (for future ML integration)
AI_MODEL_TYPE = os.getenv("AI_MODEL_TYPE", "openai")  # openai, huggingface, etc.
AI_API_KEY = os.getenv("AI_API_KEY", "")
