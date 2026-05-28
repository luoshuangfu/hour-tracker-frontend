import axios from 'axios';

const TOKEN_KEY = 'hour_tracker_token';
const DOWNLOAD_PATH_KEY = 'hour_tracker_markdown_download_path';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(username, email, password) {
  const res = await api.post('/auth/register', { username, email, password });
  return res.data;
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function me() {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function updateProfile(username) {
  const res = await api.put('/auth/profile', { username });
  return res.data;
}

export async function sendPasswordResetCode(email) {
  const res = await api.post('/auth/password-reset/send-code', { email });
  return res.data;
}

export async function confirmPasswordReset(email, code, newPassword) {
  const res = await api.post('/auth/password-reset/confirm', { email, code, newPassword });
  return res.data;
}

export async function getBlocks(date) {
  const res = await api.get(`/blocks/${date}`);
  return res.data;
}

export async function updateBlock(date, hour, data) {
  const res = await api.put(`/blocks/${date}/${hour}`, data);
  return res.data;
}

export async function getReview(date) {
  const res = await api.get(`/reviews/${date}`);
  return res.data;
}

export async function generateReview(date) {
  const res = await api.post(`/reviews/${date}/generate`);
  return res.data;
}

export function getMarkdownDownloadPath() {
  return localStorage.getItem(DOWNLOAD_PATH_KEY) || 'exports/review';
}

export function setMarkdownDownloadPath(path) {
  localStorage.setItem(DOWNLOAD_PATH_KEY, path);
}


export async function exportReview(date) {
  const res = await api.get(`/reviews/${date}/export`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const basePath = getMarkdownDownloadPath().replace(/\\+$/g, '').trim();
  const fileName = basePath ? `${basePath}/review-${date}.md` : `review-${date}.md`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getDailyNotes(date) {
  const res = await api.get(`/daily-notes/${date}`);
  return res.data;
}

export async function updateDailyNotes(date, data) {
  const res = await api.put(`/daily-notes/${date}`, data);
  return res.data;
}

export async function getTasks(date) {
  const res = await api.get(`/tasks/${date}`);
  return res.data;
}

export async function createTask(date, content) {
  const res = await api.post(`/tasks/${date}`, { content });
  return res.data;
}

export async function updateTask(date, id, data) {
  const res = await api.put(`/tasks/${date}/${id}`, data);
  return res.data;
}

export async function deleteTask(date, id) {
  const res = await api.delete(`/tasks/${date}/${id}`);
  return res.data;
}
