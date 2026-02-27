# CV Enhancer - Backend API

A FastAPI-based REST API for CV enhancement and AI-powered customization. Handles user authentication, CV management, and intelligent customization suggestions based on job descriptions.

## Features

- **User Authentication**: Secure JWT-based authentication
- **CV Management**: Upload, store, parse, and manage CV files
- **Database**: PostgreSQL for persistent data storage
- **CV Customization**: AI-powered suggestions to match job descriptions
- **RESTful API**: Clean and well-documented API endpoints
- **Security**: Password hashing, JWT tokens, input validation

## Tech Stack

- **Framework**: FastAPI
- **Server**: Uvicorn
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: Passlib with bcrypt
- **Validation**: Pydantic

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pip or poetry

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

5. Update the `.env` file with your PostgreSQL credentials:
```
DATABASE_URL=postgresql://username:password@localhost:5432/cv_enhancer
SECRET_KEY=your-secret-key-here
```

6. Create the database and tables:
```bash
python -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine)"
```

## Running the Application

### Development Mode
```bash
python run.py --reload
```

### Production Mode
```bashxl
python run.py --host 0.0.0.0
```

The API will be available at `http://localhost:8000`

API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### CV Management
- `GET /api/cvs` - Get all user CVs
- `GET /api/cvs/{id}` - Get specific CV
- `POST /api/cvs` - Create new CV
- `PUT /api/cvs/{id}` - Update CV
- `DELETE /api/cvs/{id}` - Delete CV
- `POST /api/cvs/{id}/upload` - Upload CV file

### CV Customization
- `POST /api/cvs/{id}/customize` - Analyze CV with job description
- `GET /api/cvs/{id}/suggestions` - Get customization suggestions
- `POST /api/cvs/{id}/suggestions/{suggestionId}/apply` - Apply suggestion

## Database Schema

### Users Table
- Stores user account information
- Fields: id, name, email, hashed_password, is_active, created_at, updated_at

### CVs Table
- Stores CV information and parsed data
- Fields: id, user_id, title, file_path, parsed_data, original_text, is_active, created_at, updated_at

### CV Customizations Table
- Stores customization history for CVs
- Fields: id, cv_id, job_description, matched_keywords, customized_data, score, created_at, updated_at

### Suggestions Table
- Stores AI-generated suggestions
- Fields: id, cv_id, customization_id, title, description, suggestion, section, is_applied, created_at, updated_at

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── security.py          # JWT and password utilities
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── dependencies.py      # Dependency injection
│   ├── routes/              # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py          # Authentication endpoints
│   │   └── cvs.py           # CV management endpoints
│   └── utils/               # Utility functions
│       ├── __init__.py
│       └── cv_parser.py     # CV parsing utilities
├── tests/                   # Unit tests
├── uploads/                 # Uploaded CV files
├── run.py                   # Application entry point
├── requirements.txt         # Project dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Configuration

Key configuration variables in `app/config.py`:

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key
- `ALGORITHM`: JWT algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `CORS_ORIGINS`: Allowed CORS origins
- `UPLOAD_DIRECTORY`: Directory for uploaded files

## Testing

Run unit tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app
```

## Future Enhancements

- [ ] Integrate OpenAI or HuggingFace for AI suggestions
- [ ] PDF/DOCX parsing libraries (pypdf, python-docx)
- [ ] Email verification for user registration
- [ ] Rate limiting and throttling
- [ ] File upload validation and virus scanning
- [ ] Webhook support for async processing
- [ ] GraphQL API alternative
- [ ] Cache layer (Redis)

## Docker Support

Build Docker image:
```bash
docker build -t cv-enhancer-api .
```

Run container:
```bash
docker run -p 8000:8000 --env-file .env cv-enhancer-api
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

MIT
