// Provider cho option "Mô tả nền theo ý bạn" — làm được ở gói PhotoRoom Basic/free,
// KHÔNG cần nâng gói Plus. Cách làm (3 bước hoàn toàn tách biệt, không phụ thuộc
// PhotoRoom cho phần sinh nền):
//   1. Xoá nền ảnh gốc — tái dùng provider photoroomBasic (miễn phí).
//   2. Sinh ảnh nền theo mô tả text bằng Hugging Face Inference Providers (SDK chính
//      thức `@huggingface/inference` — có gói miễn phí dạng credit, KHÔNG phải
//      unlimited; SDK tự chọn provider khả dụng thay vì tự gọi 1 endpoint cố định,
//      xem chuc-nang-tao-anh-ai.md mục 6 để biết bối cảnh đổi từ endpoint cũ).
//   3. Ghép ảnh sản phẩm (đã xoá nền, có alpha) lên trên ảnh nền vừa sinh — dùng
//      `sharp` xử lý ảnh tại chỗ, không cần AI cho bước này.
const sharp = require('sharp');
const { InferenceClient } = require('@huggingface/inference');
const { ImageAiUpstreamError, ImageAiTimeoutError } = require('../errors');

const HF_TIMEOUT_MS = Number(process.env.HUGGINGFACE_TIMEOUT_MS || 30000);
// Apache-2.0 (dùng thương mại được) — model này là "gated": người tạo
// HUGGINGFACE_API_KEY cần vào trang model trên huggingface.co bấm "Agree" 1 lần
// trước khi gọi được qua API (không phải rào cản pháp lý, chỉ là bước xác nhận).
const HF_MODEL = process.env.HUGGINGFACE_BG_MODEL || 'black-forest-labs/FLUX.1-schnell';

// Thêm hậu tố cố định để hướng model vẽ đúng 1 khung cảnh nền sạch, tránh sinh ra
// vật thể/người lạ đè lên sản phẩm khi ghép ở bước 3.
function buildPrompt(userPrompt) {
  return `${userPrompt}, empty professional product photography backdrop, no objects, no people, no text, high quality, soft even studio lighting`;
}

async function generateBackgroundImage(userPrompt) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new ImageAiUpstreamError('Chưa cấu hình HUGGINGFACE_API_KEY để dùng tính năng mô tả nền');
  }

  const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);
  const timer = new AbortController();
  const timeoutId = setTimeout(() => timer.abort(), HF_TIMEOUT_MS);

  let imageBlob;
  try {
    imageBlob = await client.textToImage(
      { model: HF_MODEL, inputs: buildPrompt(userPrompt) },
      { signal: timer.signal }
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ImageAiTimeoutError('Timeout');
    }
    throw new ImageAiUpstreamError(`Hugging Face lỗi: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  return Buffer.from(await imageBlob.arrayBuffer());
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
