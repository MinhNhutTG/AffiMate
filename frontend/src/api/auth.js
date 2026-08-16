import { request } from './client';

export function register({ email, password, name }) {
  return request('/auth/register', { method: 'POST', body: { email, password, name }, auth: false });
}

export function login({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function fetchMe({ signal } = {}) {
  return request('/auth/me', { signal });
}
