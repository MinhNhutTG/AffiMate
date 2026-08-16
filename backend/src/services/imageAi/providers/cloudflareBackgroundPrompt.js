// Provider cho option "Mô tả nền theo ý bạn" — dùng Cloudflare Workers AI
// (@cf/runwayml/stable-diffusion-v1-5-inpainting) thay cho PhotoRoom Sandbox.
// Lý do đổi: Cloudflare có free tier 10.000 neurons/ngày (KHÔNG cần thẻ tín
// dụng), và quan trọng nhất — ẢNH KHÔNG BỊ WATERMARK (khác PhotoRoom Sandbox,
// vốn luôn gắn watermark không tắt được). Đánh đổi: model Stable Diffusion 1.5
// mã nguồn mở, chất lượng/độ chân thực nhìn chung không bằng model chuyên biệt
// của PhotoRoom (đã test và thấy rất tốt), và cần verify lại vài giả định dưới
// đây bằng request thật.
//
// Cách làm — inpainting đúng nghĩa (khác hẳn cách ghép ảnh thô bằng sharp đã bỏ
// trước đây khi dùng Hugging Face):
//   1. Xoá nền bằng PhotoRoom Basic (miễn phí, có sẵn) — CHỈ để lấy alpha mask
//      phân biệt vùng sản phẩm/nền, không dùng ảnh xoá nền làm input cho model.
//   2. Suy ra mask inpainting từ kênh alpha: nền (alpha thấp) → mask cao (được
//      phép vẽ lại); sản phẩm (alpha cao) → mask thấp (giữ nguyên y hệt ảnh gốc).
//   3. Gọi Cloudflare inpainting với ẢNH GỐC (chưa xoá nền, đủ RGB) + mask vừa
//      suy ra + prompt mô tả nền — model tự giữ nguyên vùng sản phẩm, chỉ vẽ lại
//      vùng nền theo mask.
//
// ⚠️ CHƯA test bằng credentials thật (cần CLOUDFLARE_ACCOUNT_ID +
// CLOUDFLARE_API_TOKEN). 2 điểm sau suy luận từ tài liệu công khai (không có ví
// dụ request/response cụ thể), CẦN xác nhận lại bằng request thật — y hệt tình
// huống đã từng phải sửa lại giả định sai với PhotoRoom bg_color và Hugging Face:
//   - Quy ước giá trị mask (giả định: 255 = vẽ lại, 0 = giữ nguyên — quy ước phổ
//     biến nhất của họ Stable Diffusion, nhưng Cloudflare không ghi rõ).
//   - Format response (giả định: có thể là binary ảnh trực tiếp HOẶC JSON bọc
//     base64 — code xử lý cả 2 trường hợp).
const sharp = require('sharp');
const { ImageAiUpstreamError, ImageAiTimeoutError } = require('../errors');
const { fetchWithTimeout } = require('../fetchWithTimeout');
const photoroomBasic = require('./photoroomBasic');

const CF_TIMEOUT_MS = Number(process.env.CLOUDFLARE_TIMEOUT_MS || 30000);
const CF_MODEL = process.env.CLOUDFLARE_BG_MODEL || '@cf/runwayml/stable-diffusion-v1-5-inpainting';
const FETCH_SOURCE_TIMEOUT_MS = Number(process.env.FETCH_SOURCE_TIMEOUT_MS || 10000);

// Stable Diffusion 1.5 được huấn luyện ở độ phân giải 512x512 — dùng kích thước
// lớn hơn thường không tăng chất lượng, đôi khi còn tệ hơn (lặp hoạ tiết).
const WORK_SIZE = 512;

function buildPrompt(userPrompt) {
  return `${userPrompt}, empty professional product photography backdrop, no objects, no people, no text, high quality, soft even studio lighting`;
}

async function fetchSourceBuffer(sourceImageUrl) {
  const res = await fetchWithTimeout(sourceImageUrl, {}, FETCH_SOURCE_TIMEOUT_MS);
  if (!res.ok) {
    throw new ImageAiUpstreamError(`Không tải được ảnh gốc: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function buildImageAndMask(sourceImageUrl) {
  const sourceBuffer = await fetchSourceBuffer(sourceImageUrl);

  const { buffer: cutoutBuffer } = await photoroomBasic.generate({
    sourceImageUrl,
    options: { removeBackground: true },
  });

  const resizedSource = await sharp(sourceBuffer)
    .resize(WORK_SIZE, WORK_SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer();

  // negate() đảo giá trị alpha: sản phẩm (alpha cao) -> mask thấp (giữ nguyên),
  // nền (alpha thấp) -> mask cao (được vẽ lại).
  const maskBuffer = await sharp(cutoutBuffer)
    .resize(WORK_SIZE, WORK_SIZE, { fit: 'cover' })
    .ensureAlpha()
    .extractChannel('alpha')
    .negate()
    .raw()
    .toBuffer();

  return {
    image: Array.from(resizedSource),
    mask: Array.from(maskBuffer),
  };
}

async function generate({ sourceImageUrl, options }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new ImageAiUpstreamError('Chưa cấu hình CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN');
  }

  const { image, mask } = await buildImageAndMask(sourceImageUrl);

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
          image,
          mask,
          width: WORK_SIZE,
          height: WORK_SIZE,
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

  // Xử lý cả 2 khả năng response (binary ảnh trực tiếp hoặc JSON bọc base64) vì
  // chưa xác nhận được bằng request thật — xem cảnh báo đầu file.
  if (contentType.includes('application/json')) {
    const json = await res.json();
    const base64 = json?.result?.image;
    if (!base64) {
      throw new ImageAiUpstreamError('Cloudflare trả JSON không có ảnh (result.image)');
    }
    return { buffer: Buffer.from(base64, 'base64'), contentType: 'image/png' };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: contentType || 'image/png' };
}

module.exports = { generate };
