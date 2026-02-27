# CV Enhancer - Frontend

A modern React-based web application for uploading, editing, and customizing CVs based on job descriptions using AI-powered suggestions.

## Features

- **User Authentication**: Secure login and signup
- **CV Management**: Upload, store, and manage multiple CVs
- **CV Editor**: Edit and customize CV content with a user-friendly interface
- **AI-Powered Customization**: Get intelligent suggestions to match job descriptions
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend Framework**: React 18
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Build Tool**: Create React App

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your backend API URL:
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_API_TIMEOUT=30000
```

## Running the Application

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable React components
├── pages/              # Page components for routes
├── services/           # API service layer
├── store/              # Zustand state management
├── App.js              # Main App component
└── index.js            # Entry point
```

## Building for Production

Create a production build:
```bash
npm run build
```

This will create an optimized build in the `build` directory.

## API Endpoints Used

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### CV Management
- `GET /cvs` - Get all user CVs
- `GET /cvs/{id}` - Get specific CV
- `POST /cvs` - Create new CV
- `PUT /cvs/{id}` - Update CV
- `DELETE /cvs/{id}` - Delete CV
- `POST /cvs/upload` - Upload CV file

### CV Customization
- `POST /cvs/{id}/customize` - Analyze CV with job description
- `GET /cvs/{id}/suggestions` - Get customization suggestions
- `POST /cvs/{id}/suggestions/{suggestionId}/apply` - Apply suggestion

## Environment Variables

- `REACT_APP_API_URL`: Backend API base URL
- `REACT_APP_API_TIMEOUT`: API request timeout in milliseconds

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
