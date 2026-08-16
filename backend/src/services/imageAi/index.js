// Lớp interface mỏng để đổi gói/provider PhotoRoom sau này chỉ sửa 1 chỗ —
// thiết kế theo mục 9.2 chuc-nang-tao-anh-ai.md.
const providers = {
  'photoroom-basic': require('./providers/photoroomBasic'),
  'photoroom-plus': require('./providers/photoroomPlus'),
};

function getProvider() {
  const key = process.env.IMAGE_AI_PROVIDER || 'photoroom-basic';
  const impl = providers[key];
  if (!impl) {
    throw new Error(`IMAGE_AI_PROVIDER không hợp lệ: ${key}`);
  }
  return impl;
}

// generate({ sourceImageUrl, options }) => { buffer, contentType }
// hoặc throw ImageAiTimeoutError / ImageAiUpstreamError — controller không cần biết
// provider bên trong xử lý bằng cách nào (fetch-rồi-forward hay gửi thẳng URL).
function generate(args) {
  return getProvider().generate(args);
}

module.exports = { generate };
