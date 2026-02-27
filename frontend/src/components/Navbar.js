import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'My CVs', icon: '📄' },
    { to: '/cover-letters', label: 'Cover Letters', icon: '✉️' },
    { to: '/jobs', label: 'Job Tracker', icon: '🎯' },
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">CV</span>
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">CV Enhancer</span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive(to)
                    ? 'bg-primary-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 ring-2 ring-primary-200 flex items-center justify-center">
                  <span className="text-primary-700 font-semibold text-xs">{user.name?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm text-gray-700 font-medium">{user.name}</span>
              </div>
            )}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm font-medium text-gray-500 hover:text-primary border border-gray-200 hover:border-primary-200 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
