import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: { username: string; email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const documentsAPI = {
  list: (params?: { folder_id?: number; search?: string; skip?: number; limit?: number }) =>
    api.get('/documents', { params }),
  get: (id: number) => api.get(`/documents/${id}`),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (id: number) => `${API_URL}/documents/${id}/download`,
  delete: (id: number) => api.delete(`/documents/${id}`),
  rerunOcr: (id: number) => api.post(`/documents/${id}/rerun-ocr`),
  ingest: (id: number) => api.post(`/rag/ingest/${id}`),
};

export const ragAPI = {
  search: (query: string, topK: number = 5) =>
    api.post('/rag/search', { query, top_k: topK }),
  ask: (query: string, topK: number = 5) =>
    api.post('/rag/ask', { query, top_k: topK }),
};

export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  updateUserRole: (userId: number, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),
};

export default api;
