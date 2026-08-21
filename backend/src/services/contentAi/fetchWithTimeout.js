const { ContentAiTimeoutError } = require('./errors');

// Dùng chung cho các provider gọi API bên ngoài — mỗi lời gọi cần timeout riêng,
// không để 1 request treo vô thời hạn. Mirror imageAi/fetchWithTimeout.js, tách
// riêng theo domain để throw đúng loại lỗi (ContentAiTimeoutError).
async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ContentAiTimeoutError('Timeout');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWithTimeout };
