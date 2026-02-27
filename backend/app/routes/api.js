import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = process.env.REACT_APP_API_TIMEOUT || 30000;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => apiClient.post('/auth/signup', data),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
};

// CV APIs
export const cvAPI = {
  getAll: () => apiClient.get('/cvs'),
  getById: (id) => apiClient.get(`/cvs/${id}`),
  create: (data) => apiClient.post('/cvs', data),
  update: (id, data) => apiClient.put(`/cvs/${id}`, data),
  delete: (id) => apiClient.delete(`/cvs/${id}`),
  uploadFile: (cvId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/cvs/${cvId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/cvs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// CV Customization APIs
export const customizeAPI = {
  analyzeCVWithJobDescription: (cvId, jobDescription) =>
    apiClient.post(`/cvs/${cvId}/customize`, { job_description: jobDescription }),
  getSuggestions: (cvId) => apiClient.get(`/cvs/${cvId}/suggestions`),
  applySuggestion: (cvId, suggestionId) =>
    apiClient.post(`/cvs/${cvId}/suggestions/${suggestionId}/apply`),
};

export default apiClient;
