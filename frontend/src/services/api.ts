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

export const authAPI = {
  login: (username: string, password: string) => {
    return axios.post(`${API_URL}/auth/login/json`, { username, password });
  },
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
  download: async (id: number, filename: string = 'document') => {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },
  delete: (id: number) => api.delete(`/documents/${id}`),
  rerunOcr: (id: number) => api.post(`/documents/${id}/rerun-ocr`),
  ingest: (id: number) => api.post(`/rag/ingest/${id}`),
};

export const ragAPI = {
  search: (query: string, topK: number = 5) =>
    api.post(`/rag/search?query=${encodeURIComponent(query)}&top_k=${topK}`),
  ask: (query: string, topK: number = 5) =>
    api.post(`/rag/ask?query=${encodeURIComponent(query)}&top_k=${topK}`),
};

export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  updateUserRole: (userId: number, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  toggleActive: (userId: number, isActive: boolean) =>
    api.put(`/admin/users/${userId}/role`, { is_active: isActive }),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
};

export default api;
