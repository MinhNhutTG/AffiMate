import { request } from './client';

export function getStats({ signal } = {}) {
  return request('/admin/stats', { signal });
}

export function listUsers({ page = 1, limit = 20, search = '', signal } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return request(`/admin/users?${params.toString()}`, { signal });
}

export function updateUser(id, { role, status }) {
  const body = {};
  if (role) body.role = role;
  if (status) body.status = status;
  return request(`/admin/users/${id}`, { method: 'PUT', body });
}

export function deleteUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}
