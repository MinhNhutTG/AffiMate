// Provider cho option "Mô tả nền theo ý bạn" — dùng Cloudflare Workers AI
// (@cf/runwayml/stable-diffusion-v1-5-img2img) thay cho PhotoRoom Sandbox.
// Lý do đổi: Cloudflare có free tier 10.000 neurons/ngày (KHÔNG cần thẻ tín
// dụng), và quan trọng nhất — ẢNH KHÔNG BỊ WATERMARK.
//
// Request shape xác nhận bằng ví dụ thật của user (không phải suy đoán từ docs
// như lần thử inpainting trước — lần đó sai vì đoán nhầm model/tham số):
//   POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/runwayml/stable-diffusion-v1-5-img2img
//   { prompt, image: number[] (bytes của file ảnh), strength }
//   → trả thẳng binary ảnh (không bọc JSON).
//
// ⚠️ Đánh đổi cần biết: đây là img2img THUẦN (không có mask), nên model biến đổi
// TOÀN BỘ ảnh theo `strength`, không đảm bảo giữ nguyên 100% hình dạng sản phẩm
// như cách làm có mask (đã thử trước đó với model inpainting, bỏ vì đoán sai
// tham số). `strength` thấp = gần giống ảnh gốc hơn (ít đổi nền), cao = đổi
// nhiều hơn nhưng dễ làm lệch dáng sản phẩm — cần tinh chỉnh bằng mắt sau khi
// test thật.
const { ImageAiUpstreamError, ImageAiTimeoutError } = require('../errors');
const { fetchWithTimeout } = require('../fetchWithTimeout');

const CF_TIMEOUT_MS = Number(process.env.CLOUDFLARE_TIMEOUT_MS || 30000);
const CF_MODEL = process.env.CLOUDFLARE_BG_MODEL || '@cf/runwayml/stable-diffusion-v1-5-img2img';
const FETCH_SOURCE_TIMEOUT_MS = Number(process.env.FETCH_SOURCE_TIMEOUT_MS || 10000);
// 0 = gần như giữ nguyên ảnh gốc, 1 = gần như bỏ qua ảnh gốc (như text-to-image
// thuần). Giá trị mặc định vừa phải để đổi nền nhưng cố giữ dáng sản phẩm.
const STRENGTH = Number(process.env.CLOUDFLARE_IMG2IMG_STRENGTH || 0.6);

function buildPrompt(userPrompt) {
  return `product photo with ${userPrompt}, professional product photography, high quality, soft even studio lighting, keep the product unchanged`;
}

async function generate({ sourceImageUrl, options }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new ImageAiUpstreamError('Chưa cấu hình CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN');
  }

  const sourceRes = await fetchWithTimeout(sourceImageUrl, {}, FETCH_SOURCE_TIMEOUT_MS);
  if (!sourceRes.ok) {
    throw new ImageAiUpstreamError(`Không tải được ảnh gốc: HTTP ${sourceRes.status}`);
  }
  const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_MODEL}`;

  let res;
  try {
    res = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: buildPrompt(options.backgroundPrompt),
          image: Array.from(sourceBuffer),
          strength: STRENGTH,
        }),
      },
      CF_TIMEOUT_MS
    );
  } catch (err) {
    if (err instanceof ImageAiTimeoutError) throw err;
    throw new ImageAiUpstreamError(`Cloudflare lỗi: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ImageAiUpstreamError(`Cloudflare lỗi HTTP ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    // Cloudflare đôi khi trả lỗi dạng JSON dù status 200 — không cố parse thành ảnh.
    const json = await res.json().catch(() => null);
    throw new ImageAiUpstreamError(`Cloudflare trả JSON không mong đợi: ${JSON.stringify(json)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: contentType || 'image/png' };
}

module.exports = { generate };
