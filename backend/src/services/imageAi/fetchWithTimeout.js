const { ImageAiTimeoutError } = require('./errors');

// Dùng chung cho các provider gọi API bên ngoài (PhotoRoom, Hugging Face...) — mỗi
// lời gọi cần timeout riêng, không để 1 request treo vô thời hạn (mục 9 chuc-nang-tao-anh-ai.md).
async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ImageAiTimeoutError('Timeout');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWithTimeout };
