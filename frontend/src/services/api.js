import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = process.env.REACT_APP_API_TIMEOUT || 30000;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => apiClient.post('/auth/signup', data),
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
};

// ── CV ────────────────────────────────────────────────────────────────────────
export const cvAPI = {
  getAll: () => apiClient.get('/cvs'),
  getOne: (id) => apiClient.get(`/cvs/${id}`),
  create: (data) => apiClient.post('/cvs', data),
  update: (id, data) => apiClient.put(`/cvs/${id}`, data),
  delete: (id) => apiClient.delete(`/cvs/${id}`),

  uploadFile: (cvId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/cvs/${cvId}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  uploadPhoto: (cvId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/cvs/${cvId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  exportPDF: async (cvId, title = 'CV') => {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_URL}/cvs/${cvId}/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('PDF export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '_')}.pdf`; a.click();
    URL.revokeObjectURL(url);
  },

  analyze: (cvId) => apiClient.post(`/cvs/${cvId}/analyze`),

  enhanceForJob: (cvId, jobDescription) =>
    apiClient.post(`/cvs/${cvId}/enhance-for-job`, { job_description: jobDescription }),

  applyAIChanges: (cvId, enhancedCv) =>
    apiClient.post(`/cvs/${cvId}/apply-ai-changes`, { enhanced_cv: enhancedCv }),
};

// ── AI Customize ──────────────────────────────────────────────────────────────
export const customizeAPI = {
  analyze: (cvId, jobDescription) => apiClient.post(`/cvs/${cvId}/customize`, { job_description: jobDescription }),
  analyzeCVWithJobDescription: (cvId, jobDescription) => apiClient.post(`/cvs/${cvId}/customize`, { job_description: jobDescription }),
  getSuggestions: (cvId) => apiClient.get(`/cvs/${cvId}/suggestions`),
  applySuggestion: (cvId, sid) => apiClient.post(`/cvs/${cvId}/suggestions/${sid}/apply`),
};

// ── AI Cover Letter Generation ─────────────────────────────────────────────────
export const aiCoverLetterAPI = {
  generateWithAI: (cvId, jobDescription, title) =>
    apiClient.post('/cover-letters/generate-with-ai', { cv_id: cvId, job_description: jobDescription, title }),
  extractFromURL: (url) =>
    apiClient.post('/cover-letters/extract-job-from-url', { url }),
};

// ── Cover Letters ─────────────────────────────────────────────────────────────
export const coverLetterAPI = {
  getAll: () => apiClient.get('/cover-letters'),
  get: (id) => apiClient.get(`/cover-letters/${id}`),
  getOne: (id) => apiClient.get(`/cover-letters/${id}`),
  create: (data) => apiClient.post('/cover-letters', data),
  update: (id, data) => apiClient.put(`/cover-letters/${id}`, data),
  delete: (id) => apiClient.delete(`/cover-letters/${id}`),
  generateWithAI: (cvId, jobDescription, title = "AI Generated Cover Letter") =>
    apiClient.post('/cover-letters/generate-with-ai', { cv_id: cvId, job_description: jobDescription, title }),
  extractFromURL: (url) =>
    apiClient.post('/cover-letters/extract-job-from-url', { url }),
};

// ── Job Applications ──────────────────────────────────────────────────────────
export const jobApplicationAPI = {
  getAll: (statusFilter) => apiClient.get('/job-applications', { params: statusFilter ? { status: statusFilter } : {} }),
  getOne: (id) => apiClient.get(`/job-applications/${id}`),
  create: (data) => apiClient.post('/job-applications', data),
  update: (id, data) => apiClient.put(`/job-applications/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/job-applications/${id}/status`, null, { params: { new_status: status } }),
  delete: (id) => apiClient.delete(`/job-applications/${id}`),
  getStats: () => apiClient.get('/job-applications/stats'),
};

// ── Admin (Superuser) ─────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => apiClient.get('/admin/stats'),
  getUsers: () => apiClient.get('/admin/users'),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
};

export default apiClient;
