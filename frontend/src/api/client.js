const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'affimate_token';

export class ApiError extends Error {
  constructor(message, status, extra) {
    super(message);
    this.status = status;
    this.extra = extra || {};
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// `signal` (AbortSignal, tuỳ chọn) — cho phép huỷ request khi component unmount,
// tránh gọi lặp request khi effect chạy lại (vd React StrictMode ở dev mode chạy
// lại effect 1 lần để kiểm tra cleanup — không có signal thì mỗi lần chạy lại sẽ
// bắn thêm 1 request thật tới server dù chỉ cần kết quả của lần cuối).
export async function request(path, { method = 'GET', body, isFormData = false, auth = true, signal } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại', res.status, data || {});
  }

  return data;
}
