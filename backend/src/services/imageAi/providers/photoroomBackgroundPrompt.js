// Provider cho option "Mô tả nền theo ý bạn" — dùng PhotoRoom Sandbox mode
// (endpoint /v2/edit, tham số background.prompt), KHÔNG cần gói PhotoRoom Plus.
// Sandbox mode dùng chung PHOTOROOM_API_KEY hiện có (chỉ cần thêm tiền tố
// "sandbox_" khi gửi), không cần tài khoản/API key riêng — xem
// chuc-nang-tao-anh-ai.md mục 6.
//
// Đánh đổi ĐÃ XÁC NHẬN qua tài liệu PhotoRoom, cần biết trước khi dùng thật:
// - Ảnh trả về LUÔN có watermark PhotoRoom ở sandbox mode — KHÔNG tắt được. Chỉ
//   gọi được ảnh sạch (không watermark) nếu dùng key production thật của gói Plus
//   (trả phí) — đổi qua env PHOTOROOM_BACKGROUND_SANDBOX=false khi đã nâng gói.
// - Giới hạn 1.000 lượt/tháng, tối đa 100 lượt/ngày — CHUNG cho toàn app (tính
//   trên 1 API key), không phải riêng từng user. Với quota hiện tại (10 ảnh/user/
//   ngày), chỉ cần ~10 user cùng dùng option này trong 1 ngày là có thể chạm trần
//   sandbox chung — chưa có cơ chế bảo vệ riêng cho giới hạn này (mục 11).
const { ImageAiUpstreamError } = require('../errors');
const { fetchWithTimeout } = require('../fetchWithTimeout');

const FETCH_SOURCE_TIMEOUT_MS = Number(process.env.FETCH_SOURCE_TIMEOUT_MS || 10000);
const PHOTOROOM_TIMEOUT_MS = Number(process.env.PHOTOROOM_TIMEOUT_MS || 20000);
const PHOTOROOM_EDIT_ENDPOINT = 'https://image-api.photoroom.com/v2/edit';

// true (mặc định) = gọi sandbox (miễn phí, có watermark).
// false = gọi production thật (cần gói Plus trả phí, không watermark).
const USE_SANDBOX = (process.env.PHOTOROOM_BACKGROUND_SANDBOX ?? 'true') !== 'false';

function resolveApiKey() {
  const key = process.env.PHOTOROOM_API_KEY;
  if (!key || !USE_SANDBOX) return key;
  return key.startsWith('sandbox_') ? key : `sandbox_${key}`;
}

async function generate({ sourceImageUrl, options }) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new ImageAiUpstreamError('Chưa cấu hình PHOTOROOM_API_KEY');
  }

  // Tải ảnh gốc từ Cloudinary về buffer — cùng cách với photoroomBasic (mục 9.1),
  // vì /v2/edit cũng chỉ xác nhận nhận file binary (imageFile) qua ví dụ chính
  // thức, chưa xác nhận input URL trực tiếp cho POST.
  const sourceRes = await fetchWithTimeout(sourceImageUrl, {}, FETCH_SOURCE_TIMEOUT_MS);
  if (!sourceRes.ok) {
    throw new ImageAiUpstreamError(`Không tải được ảnh gốc: HTTP ${sourceRes.status}`);
  }
  const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());

  const form = new FormData();
  form.append('imageFile', new Blob([sourceBuffer]), 'source.jpg');
  // Giữ khung ảnh gốc làm mốc canh vị trí sản phẩm — đúng theo ví dụ chính thức
  // của PhotoRoom cho AI Backgrounds.
  form.append('referenceBox', 'originalImage');
  form.append('background.prompt', options.backgroundPrompt);

  const res = await fetchWithTimeout(
    PHOTOROOM_EDIT_ENDPOINT,
    {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
    },
    PHOTOROOM_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ImageAiUpstreamError(`PhotoRoom lỗi HTTP ${res.status}: ${text}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/png';
  return { buffer, contentType };
}

module.exports = { generate };
