import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vkb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const auth = {
  start: (email: string) => api.post('/auth/start', { email }),
  verify: (token: string) => api.post('/auth/verify', { token }),
};

// Sessions
export const sessions = {
  list: () => api.get('/sessions'),
  get: (id: string) => api.get(`/sessions/${id}`),
  create: (module?: string) => api.post('/sessions', { module }),
  addTurn: (sessionId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return api.post(`/sessions/${sessionId}/turns`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getNextQuestion: (sessionId: string) => api.post(`/sessions/${sessionId}/agent/next`),
  extract: (sessionId: string) => api.post(`/sessions/${sessionId}/extract`),
};

// Knowledge Base
export const kb = {
  search: (q: string, limit = 20) => api.get('/kb/search', { params: { q, limit } }),
  export: (format: 'json' | 'markdown' = 'json') => api.get('/kb/export', { params: { format }, responseType: 'blob' }),
  stats: () => api.get('/kb/stats'),
};
