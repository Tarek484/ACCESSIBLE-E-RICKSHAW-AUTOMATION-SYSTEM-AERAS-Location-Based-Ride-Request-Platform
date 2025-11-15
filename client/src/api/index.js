import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/admin/login', { email, password }),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getRequests: (params) => api.get('/admin/requests', { params }),
  getRiders: (params) => api.get('/admin/riders', { params }),
  getBooths: () => api.get('/admin/booths'),
  getPendingPoints: () => api.get('/admin/points/pending'),
  approvePoints: (reviewId) => api.post('/admin/points/approve', { reviewId }),
  rejectPoints: (reviewId, notes) => api.post('/admin/points/reject', { reviewId, notes }),
  cancelRequest: (requestId) => api.post('/admin/request/cancel', { requestId }),
  getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
