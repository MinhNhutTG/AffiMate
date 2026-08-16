// Provider cho gói PhotoRoom Basic/free — endpoint /v1/segment, chỉ nhận image_file
// dạng binary (KHÔNG có tham số URL) — đã xác nhận qua tài liệu PhotoRoom, xem
// chuc-nang-tao-anh-ai.md mục 9.1. Vì vậy bước fetch-rồi-forward là bắt buộc.
const { ImageAiTimeoutError, ImageAiUpstreamError } = require('../errors');

const FETCH_SOURCE_TIMEOUT_MS = Number(process.env.FETCH_SOURCE_TIMEOUT_MS || 10000);
const PHOTOROOM_TIMEOUT_MS = Number(process.env.PHOTOROOM_TIMEOUT_MS || 20000);
const PHOTOROOM_ENDPOINT = 'https://sdk.photoroom.com/v1/segment';

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

// Mapping whitelist nội bộ (mục 6 chuc-nang-tao-anh-ai.md) -> tham số thật của PhotoRoom.
// Đặt trong provider, không ở controller, để đổi tên tham số thật không ảnh hưởng
// tới whitelist nội bộ (mục 9.2).
//
// bg_color BẮT BUỘC giữ nguyên dấu '#' (định dạng hex code PhotoRoom yêu cầu, vd
// '#FF00FF') — trước đây code lỡ .replace('#', '') làm mất dấu #, khiến PhotoRoom
// trả lỗi 400 "wrong_key_value_combination" (đã xác nhận lại qua tài liệu PhotoRoom).
function mapOptions(options) {
  const params = {};
  if (options.bgColor) {
    params.bg_color = options.bgColor;
  }
  return params;
}

async function generate({ sourceImageUrl, options }) {
  // 1. Tải ảnh gốc từ Cloudinary về buffer — mục 3.3 / 9.1
  const sourceRes = await fetchWithTimeout(sourceImageUrl, {}, FETCH_SOURCE_TIMEOUT_MS);
  if (!sourceRes.ok) {
    throw new ImageAiUpstreamError(`Không tải được ảnh gốc: HTTP ${sourceRes.status}`);
  }
  const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());

  // 2. Forward multipart (image_file) tới PhotoRoom /v1/segment
  const form = new FormData();
  form.append('image_file', new Blob([sourceBuffer]), 'source.jpg');
  const params = mapOptions(options);
  for (const [key, value] of Object.entries(params)) {
    form.append(key, String(value));
  }

  const prRes = await fetchWithTimeout(
    PHOTOROOM_ENDPOINT,
    {
      method: 'POST',
      headers: { 'x-api-key': process.env.PHOTOROOM_API_KEY },
      body: form,
    },
    PHOTOROOM_TIMEOUT_MS
  );

  if (!prRes.ok) {
    const text = await prRes.text().catch(() => '');
    throw new ImageAiUpstreamError(`PhotoRoom lỗi HTTP ${prRes.status}: ${text}`);
  }

  const buffer = Buffer.from(await prRes.arrayBuffer());
  const contentType = prRes.headers.get('content-type') || 'image/png';
  return { buffer, contentType };
}

module.exports = { generate };
