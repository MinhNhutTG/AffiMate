// Provider cho "Sinh nội dung tự động" — dùng Cloudflare Workers AI (model chat/
// instruct), dùng lại CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN đã có sẵn cho
// tính năng đổi nền (chuc-nang-tao-anh-ai.md mục 6). Free tier, không cần đăng ký
// thêm — quyết định đã chốt với user khi lên kế hoạch tính năng này.
const { ContentAiUpstreamError, ContentAiTimeoutError } = require('../errors');
const { fetchWithTimeout } = require('../fetchWithTimeout');

const CF_TIMEOUT_MS = Number(process.env.CLOUDFLARE_CONTENT_TIMEOUT_MS || 30000);
const CF_MODEL = process.env.CLOUDFLARE_CONTENT_MODEL || '@cf/meta/llama-3.1-8b-instruct';

const TONE_LABELS = {
  'gan-gui': 'gần gũi, thân thiện',
  'hai-huoc': 'hài hước, vui nhộn',
  'chuyen-nghiep': 'chuyên nghiệp, đáng tin cậy',
};

function buildPrompt({ productName, productDescription, tone }) {
  const toneLabel = TONE_LABELS[tone] || TONE_LABELS['gan-gui'];
  return `Bạn là chuyên gia viết kịch bản video TikTok bán hàng (Affiliate) tại Việt Nam.
Viết kịch bản ngắn quảng bá sản phẩm sau, giọng điệu ${toneLabel}.

Tên sản phẩm: ${productName}
Mô tả: ${productDescription || '(không có mô tả)'}

Trả lời DUY NHẤT bằng JSON hợp lệ, đúng định dạng sau, không thêm giải thích,
không bọc markdown:
{"hook": "câu mở đầu gây chú ý trong 3 giây đầu video", "body": "nội dung chính giới thiệu lợi ích sản phẩm, 3-5 câu", "cta": "câu kêu gọi hành động, chốt đơn"}`;
}

// Model instruct đôi khi bọc code fence ```json ... ``` quanh JSON — strip trước khi parse.
function parseResult(raw) {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ContentAiUpstreamError('AI trả về định dạng không hợp lệ');
  }

  const { hook, body, cta } = parsed || {};
  if (!hook || !body || !cta) {
    throw new ContentAiUpstreamError('AI trả về thiếu nội dung');
  }
  return { hook: String(hook), body: String(body), cta: String(cta) };
}

async function generate({ productName, productDescription, tone }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new ContentAiUpstreamError('Chưa cấu hình CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN');
  }

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
          messages: [{ role: 'user', content: buildPrompt({ productName, productDescription, tone }) }],
        }),
      },
      CF_TIMEOUT_MS
    );
  } catch (err) {
    if (err instanceof ContentAiTimeoutError) throw err;
    throw new ContentAiUpstreamError(`Cloudflare lỗi: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ContentAiUpstreamError(`Cloudflare lỗi HTTP ${res.status}: ${text}`);
  }

  const json = await res.json().catch(() => null);
  // Các model instruct hiện hành (llama-3.x, mistral...) trả theo format tương
  // thích OpenAI chat.completions (result.choices[0].message.content), KHÔNG phải
  // result.response như 1 số model cũ/đã deprecated — đã xác nhận qua test thật.
  const raw = json?.result?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new ContentAiUpstreamError('Cloudflare trả về rỗng');
  }

  return parseResult(raw);
}

module.exports = { generate };
