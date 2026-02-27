import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CVViewPage from './pages/CVViewPage';  // ← NEW: Import view page
import CVEditorPage from './pages/CVEditorPage';
import CVCustomizePage from './pages/CVCustomizePage';
import CoverLetterPage from './pages/CoverLetterPage';
import CoverLetterViewPage from './pages/CoverLetterViewPage';  // ← Already imported
import CoverLetterEditorPage from './pages/CoverLetterEditorPage';
import CoverLetterGeneratorPage from './pages/CoverLetterGeneratorPage';
import JobTrackerPage from './pages/JobTrackerPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Navbar />}
        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ==================== PROTECTED ROUTES ==================== */}

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* ===== CV ROUTES (SEPARATED: View vs Edit) ===== */}
          {/* View Page - Display CV content (READ-ONLY) */}
          <Route path="/cv/:cvId" element={<ProtectedRoute><CVViewPage /></ProtectedRoute>} />

          {/* Edit Page - Modify CV content */}
          <Route path="/cv/:cvId/edit" element={<ProtectedRoute><CVEditorPage /></ProtectedRoute>} />

          {/* Backward compatibility */}
          <Route path="/cv-editor/:cvId" element={<ProtectedRoute><CVEditorPage /></ProtectedRoute>} />

          {/* AI Customize */}
          <Route path="/cv/:cvId/customize" element={<ProtectedRoute><CVCustomizePage /></ProtectedRoute>} />
          <Route path="/cv-customize/:cvId" element={<ProtectedRoute><CVCustomizePage /></ProtectedRoute>} />

          {/* ===== COVER LETTER ROUTES (SEPARATED: View vs Edit) ===== */}
          {/* List Page */}
          <Route path="/cover-letters" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />

          {/* View Page - Display letter content (READ-ONLY) */}
          <Route path="/cover-letters/:id/view" element={<ProtectedRoute><CoverLetterViewPage /></ProtectedRoute>} />

          {/* Edit Page - Modify letter content */}
          <Route path="/cover-letters/:id/edit" element={<ProtectedRoute><CoverLetterEditorPage /></ProtectedRoute>} />

          {/* Backward compatibility - keep old route pointing to view page */}
          <Route path="/cover-letter/:id" element={<ProtectedRoute><CoverLetterViewPage /></ProtectedRoute>} />

          {/* Generator Page */}
          <Route path="/cover-letter/new" element={<ProtectedRoute><CoverLetterGeneratorPage /></ProtectedRoute>} />

          {/* Job Tracker */}
          <Route path="/jobs" element={<ProtectedRoute><JobTrackerPage /></ProtectedRoute>} />

          {/* ==================== DEFAULT ROUTES ==================== */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;