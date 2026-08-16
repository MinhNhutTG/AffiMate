import { request } from './client';

// options: { removeBackground: true, bgColor?: '#RRGGBB' } — whitelist đúng mục 6
// chuc-nang-tao-anh-ai.md, KHÔNG có backgroundPrompt vì provider Plus chưa triển
// khai ở backend (mục 11 câu 10).
export function generateImage(productId, { sourceImageUrl, options }) {
  return request(`/products/${productId}/generate-image`, {
    method: 'POST',
    body: { sourceImageUrl, options },
  });
}

export function listImages(productId, { page = 1, limit = 20 } = {}) {
  return request(`/products/${productId}/images?page=${page}&limit=${limit}`);
}

export function deleteImage(id) {
  return request(`/images/${id}`, { method: 'DELETE' });
}
