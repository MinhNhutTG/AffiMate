// Lớp interface mỏng để đổi gói/provider PhotoRoom sau này chỉ sửa 1 chỗ —
// thiết kế theo mục 9.2 chuc-nang-tao-anh-ai.md.
const providers = {
  'photoroom-basic': require('./providers/photoroomBasic'),
  'photoroom-plus': require('./providers/photoroomPlus'),
};

const backgroundPromptProviders = {
  cloudflare: require('./providers/cloudflareBackgroundPrompt'),
  'photoroom-sandbox': require('./providers/photoroomBackgroundPrompt'),
};

function getProvider() {
  const key = process.env.IMAGE_AI_PROVIDER || 'photoroom-basic';
  const impl = providers[key];
  if (!impl) {
    throw new Error(`IMAGE_AI_PROVIDER không hợp lệ: ${key}`);
  }
  return impl;
}

function getBackgroundPromptProvider() {
  const key = process.env.BACKGROUND_PROMPT_PROVIDER || 'cloudflare';
  const impl = backgroundPromptProviders[key];
  if (!impl) {
    throw new Error(`BACKGROUND_PROMPT_PROVIDER không hợp lệ: ${key}`);
  }
  return impl;
}

// generate({ sourceImageUrl, options }) => { buffer, contentType }
// hoặc throw ImageAiTimeoutError / ImageAiUpstreamError — controller không cần biết
// provider bên trong xử lý bằng cách nào (fetch-rồi-forward hay gửi thẳng URL).
//
// `backgroundPrompt` luôn đi qua 1 trong các provider riêng ở
// `backgroundPromptProviders` (chọn qua env `BACKGROUND_PROMPT_PROVIDER`, mặc
// định `cloudflare` — không watermark, xem chuc-nang-tao-anh-ai.md mục 6),
// KHÔNG phụ thuộc IMAGE_AI_PROVIDER.
function generate(args) {
  if (args.options?.backgroundPrompt) {
    return getBackgroundPromptProvider().generate(args);
  }
  return getProvider().generate(args);
}

module.exports = { generate };
