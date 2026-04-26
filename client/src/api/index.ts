import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 60000,
});

// 请求拦截：自动带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 跳转登录
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// --- 认证 ---
export const register = (username: string, password: string) =>
  api.post('/auth/register', { username, password });

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

// --- 简历 ---
export const uploadResume = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/resume/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// --- JD ---
export const parseJdText = (jd_text: string) =>
    api.post('/jd/parse_text', { jd_text });


export const uploadJdImage = (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/jd/upload_image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

// --- 匹配分析 ---
export const analyzeMatch = (resume_json: any, jd_json: any) =>
    api.post('/match/analyze', { resume_json, jd_json });

export default api;