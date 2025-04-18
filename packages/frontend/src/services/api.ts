import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5012') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization header interceptor
api.interceptors.request.use((config) => {
  // Don't add auth header for auth routes
  if (config.url?.includes('/auth/')) {
    return config;
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;