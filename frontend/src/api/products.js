import { request } from './client';

export function listProducts() {
  return request('/products');
}

export function getProduct(id) {
  return request(`/products/${id}`);
}

export function createProduct({ name, description, files }) {
  const form = new FormData();
  form.append('name', name);
  if (description) form.append('description', description);
  files.forEach((file) => form.append('images', file));
  return request('/products', { method: 'POST', body: form, isFormData: true });
}

export function updateProduct(id, { name, description }) {
  return request(`/products/${id}`, { method: 'PUT', body: { name, description } });
}

export function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' });
}
