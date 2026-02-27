# GitHub Copilot Instructions for CV Enhancer Project

This document provides custom instructions for GitHub Copilot when working with the CV Enhancer project.

## Project Context

- **Project Name**: CV Enhancer
- **Type**: Full-stack web application
- **Frontend**: React 18 with Tailwind CSS
- **Backend**: FastAPI with PostgreSQL
- **Architecture**: Microservices (separate frontend and backend)

## Code Style Guidelines

### Frontend (React)
- Use functional components with hooks
- State management with Zustand
- Tailwind CSS for styling
- ES6+ syntax
- Props destructuring
- Component organization in `src/components/` and `src/pages/`

### Backend (FastAPI)
- Use type hints for all functions
- SQLAlchemy models with proper relationships
- Pydantic schemas for request/response validation
- Dependency injection with `Depends()`
- RESTful naming conventions
- Proper HTTP status codes

## Development Practices

1. **Authentication**: Use JWT tokens stored in Zustand store
2. **API Calls**: Use axios with interceptors in `services/api.js`
3. **Error Handling**: Catch and display user-friendly errors
4. **Validation**: Server-side validation in FastAPI, client-side in React
5. **Database**: PostgreSQL with SQLAlchemy ORM
6. **Security**: Password hashing, CORS, HTTPS in production

## File Organization

### Frontend Structure
```
src/
├── components/      # Reusable components
├── pages/          # Page components
├── services/       # API services
├── store/          # Zustand stores
└── App.js          # Main component
```

### Backend Structure
```
app/
├── routes/         # API route handlers
├── models.py       # SQLAlchemy models
├── schemas.py      # Pydantic schemas
├── security.py     # Auth & security
├── database.py     # DB connection
└── config.py       # Configuration
```

## Common Tasks

### Adding a New API Endpoint
1. Create route handler in `app/routes/`
2. Define Pydantic schema in `app/schemas.py`
3. Add function to `app/services/api.js` in frontend
4. Create component/page to use the endpoint

### Adding a New Feature
1. Plan the workflow
2. Create backend models and schemas
3. Implement API endpoints
4. Create frontend components
5. Add state management
6. Test end-to-end

### Database Changes
1. Modify `app/models.py`
2. Create migration (future: use Alembic)
3. Update schemas if needed
4. Test with PostgreSQL

## Testing Approach

- **Frontend**: React Testing Library for components
- **Backend**: Pytest for unit and integration tests
- **API**: Use FastAPI TestClient

## Documentation Standards

- Add docstrings to all functions
- Include type hints
- Document API endpoints
- Add comments for complex logic
- Keep README.md updated

## Security Considerations

- Never commit `.env` files with secrets
- Validate all user input
- Use HTTPS in production
- Hash passwords with bcrypt
- Implement rate limiting
- Validate file uploads
- Use CORS carefully

## Performance Tips

- Lazy load components in React
- Use database indexes for frequent queries
- Implement pagination for large datasets
- Cache API responses where appropriate
- Optimize images and assets

## Deployment Notes

- Both services containerized with Docker
- Use docker-compose for local development
- Environment variables via `.env` files
- Database migrations before deployment
- Health check endpoints configured

## Integration Points

1. **Frontend ↔ Backend**: REST API with JWT auth
2. **Backend ↔ Database**: SQLAlchemy ORM
3. **AI Integration** (future): External API calls from backend
4. **File Upload**: Multipart form data for CV files

---

**Last Updated**: February 2026
**Maintained by**: Development Team
