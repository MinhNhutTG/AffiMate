// Lớp interface mỏng để đổi provider sinh nội dung sau này chỉ sửa 1 chỗ —
// mirror imageAi/index.js.
const providers = {
  cloudflare: require('./providers/cloudflareText'),
};

function getProvider() {
  const key = process.env.CONTENT_AI_PROVIDER || 'cloudflare';
  const impl = providers[key];
  if (!impl) {
    throw new Error(`CONTENT_AI_PROVIDER không hợp lệ: ${key}`);
  }
  return impl;
}

// generate({ productName, productDescription, tone }) => { hook, body, cta }
// hoặc throw ContentAiTimeoutError / ContentAiUpstreamError.
function generate(args) {
  return getProvider().generate(args);
}

module.exports = { generate };
