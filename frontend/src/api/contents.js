import { request } from './client';

export function generateContent(productId, { tone }) {
  return request(`/products/${productId}/generate-content`, {
    method: 'POST',
    body: { tone },
  });
}

export function listContents(productId, { page = 1, limit = 20, signal } = {}) {
  return request(`/products/${productId}/contents?page=${page}&limit=${limit}`, { signal });
}

export function deleteContent(id) {
  return request(`/contents/${id}`, { method: 'DELETE' });
}
