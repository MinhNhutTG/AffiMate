const GeneratedContent = require('../models/GeneratedContent');
const contentAiService = require('../services/contentAi');
const { ContentAiTimeoutError } = require('../services/contentAi/errors');
const quotaService = require('../services/quotaService');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, UpstreamError } = require('../utils/errors');
const { loadOwnedProduct } = require('./product.controller');

const TONES = ['gan-gui', 'hai-huoc', 'chuyen-nghiep'];

const generateContent = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);

  const tone = TONES.includes(req.body.tone) ? req.body.tone : 'gan-gui';

  // Kiểm tra quota TRƯỚC khi gọi AI — cùng nguyên tắc với generate-image.
  await quotaService.consumeContentQuota(req.user._id);

  const record = await GeneratedContent.create({
    userId: req.user._id,
    productId: product._id,
    tone,
    status: 'pending',
  });

  // Chỉ bọc try/catch quanh bước gọi AI — record.save() ở nhánh thành công KHÔNG
  // được đặt trong try/catch này, cùng lý do đã ghi chú ở image.controller.js:
  // tránh 1 lỗi ghi DB thoáng qua SAU KHI đã sinh nội dung thành công bị nuốt vào
  // catch và ghi đè record thành "failed" trong khi user đã tốn 1 lượt quota.
  let generated;
  try {
    generated = await contentAiService.generate({
      productName: product.name,
      productDescription: product.description,
      tone,
    });
  } catch (err) {
    record.status = 'failed';
    record.errorMessage =
      err instanceof ContentAiTimeoutError ? 'Hết thời gian chờ tạo nội dung' : 'Không tạo được nội dung, vui lòng thử lại';
    await record.save();

    console.error('[generate-content] lỗi thật:', err);
    throw new UpstreamError(record.errorMessage);
  }

  record.hook = generated.hook;
  record.body = generated.body;
  record.cta = generated.cta;
  record.status = 'success';
  await record.save();

  return res.json(record);
});

const listContents = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const [items, total] = await Promise.all([
    GeneratedContent.find({ productId: product._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    GeneratedContent.countDocuments({ productId: product._id }),
  ]);

  res.json({ items, total, page, limit });
});

const deleteContent = asyncHandler(async (req, res) => {
  const content = await GeneratedContent.findById(req.params.id);
  if (!content) throw new NotFoundError('Không tìm thấy nội dung');
  if (String(content.userId) !== String(req.user._id)) {
    throw new ForbiddenError('Không có quyền');
  }

  await content.deleteOne();
  res.status(204).send();
});

module.exports = { generateContent, listContents, deleteContent };
