import { request } from './client';

// options: { removeBackground: true, bgColor?: '#RRGGBB' } hoặc
// { removeBackground: true, backgroundPrompt: string } — whitelist đúng mục 6
// chuc-nang-tao-anh-ai.md.
export function generateImage(productId, { sourceImageUrl, options }) {
  return request(`/products/${productId}/generate-image`, {
    method: 'POST',
    body: { sourceImageUrl, options },
  });
}

export function listImages(productId, { page = 1, limit = 20, signal } = {}) {
  return request(`/products/${productId}/images?page=${page}&limit=${limit}`, { signal });
}

export function deleteImage(id) {
  return request(`/images/${id}`, { method: 'DELETE' });
}
