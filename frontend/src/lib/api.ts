import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      // Don't try to refresh if we are already on the login page
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        const res = await api.post('/auth/refresh', {}, {
          headers: {
            'x-refresh-token': refreshToken || ''
          }
        });
        
        if (typeof window !== 'undefined' && res.data.accessToken) {
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }
        
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, it means we are truly logged out.
        // We can redirect to login here or handle it in the context
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
