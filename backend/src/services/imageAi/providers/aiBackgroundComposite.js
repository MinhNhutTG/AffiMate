// Provider cho option "Mô tả nền theo ý bạn" — làm được ở gói PhotoRoom Basic/free,
// KHÔNG cần nâng gói Plus. Cách làm (3 bước hoàn toàn tách biệt, không phụ thuộc
// PhotoRoom cho phần sinh nền):
//   1. Xoá nền ảnh gốc — tái dùng provider photoroomBasic (miễn phí).
//   2. Sinh ảnh nền theo mô tả text bằng Hugging Face Inference API (có gói miễn phí).
//   3. Ghép ảnh sản phẩm (đã xoá nền, có alpha) lên trên ảnh nền vừa sinh — dùng
//      `sharp` xử lý ảnh tại chỗ, không cần AI cho bước này.
const sharp = require('sharp');
const { ImageAiUpstreamError } = require('../errors');
const { fetchWithTimeout } = require('../fetchWithTimeout');
const photoroomBasic = require('./photoroomBasic');

const HF_TIMEOUT_MS = Number(process.env.HUGGINGFACE_TIMEOUT_MS || 30000);
const HF_MODEL = process.env.HUGGINGFACE_BG_MODEL || 'black-forest-labs/FLUX.1-schnell';
const HF_ENDPOINT = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Thêm hậu tố cố định để hướng model vẽ đúng 1 khung cảnh nền sạch, tránh sinh ra
// vật thể/người lạ đè lên sản phẩm khi ghép ở bước 3.
function buildPrompt(userPrompt) {
  return `${userPrompt}, empty professional product photography backdrop, no objects, no people, no text, high quality, soft even studio lighting`;
}

async function generateBackgroundImage(userPrompt) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new ImageAiUpstreamError('Chưa cấu hình HUGGINGFACE_API_KEY để dùng tính năng mô tả nền');
  }

  const res = await fetchWithTimeout(
    HF_ENDPOINT,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: buildPrompt(userPrompt) }),
    },
    HF_TIMEOUT_MS
  );

  const contentType = res.headers.get('content-type') || '';
  // Hugging Face Inference API trả lỗi (vd model đang "cold start") dạng JSON thay
  // vì trả thẳng ảnh — coi đây cũng là lỗi upstream, không cố parse thành ảnh.
  if (!res.ok || contentType.includes('application/json')) {
    const detail = await res.text().catch(() => '');
    throw new ImageAiUpstreamError(`Hugging Face lỗi HTTP ${res.status}: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function compositeOverBackground(cutoutBuffer, backgroundBuffer) {
  const cutoutMeta = await sharp(cutoutBuffer).metadata();

  const resizedBackground = await sharp(backgroundBuffer)
    .resize(cutoutMeta.width, cutoutMeta.height, { fit: 'cover' })
    .toBuffer();

  return sharp(resizedBackground)
    .composite([{ input: cutoutBuffer }])
    .png()
    .toBuffer();
}

async function generate({ sourceImageUrl, options }) {
  // Bước 1: xoá nền — luôn dùng removeBackground thuần (không kèm bgColor), vì cần
  // ảnh có alpha trong suốt để ghép ở bước 3.
  const { buffer: cutoutBuffer } = await photoroomBasic.generate({
    sourceImageUrl,
    options: { removeBackground: true },
  });

  // Bước 2: sinh nền theo mô tả
  const backgroundBuffer = await generateBackgroundImage(options.backgroundPrompt);

  // Bước 3: ghép — lỗi ở bước này (ảnh hỏng, sharp không đọc được...) cũng coi là
  // lỗi upstream chung, không cần phân loại riêng.
  let buffer;
  try {
    buffer = await compositeOverBackground(cutoutBuffer, backgroundBuffer);
  } catch (err) {
    throw new ImageAiUpstreamError(`Ghép ảnh thất bại: ${err.message}`);
  }

  return { buffer, contentType: 'image/png' };
}

module.exports = { generate };
