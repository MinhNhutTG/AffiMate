const GeneratedImage = require('../models/GeneratedImage');
const cloudinaryService = require('../services/cloudinaryService');
const imageAiService = require('../services/imageAi');
const { ImageAiTimeoutError } = require('../services/imageAi/errors');
const quotaService = require('../services/quotaService');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError, ForbiddenError, UpstreamError } = require('../utils/errors');
const { loadOwnedProduct } = require('./product.controller');

// Whitelist — mục 6 chuc-nang-tao-anh-ai.md. Chỉ forward đúng các key này,
// không bao giờ forward nguyên object client gửi lên.
function sanitizeOptions(raw) {
  const options = {};
  if (raw && raw.removeBackground === true) {
    options.removeBackground = true;
  }
  if (raw && typeof raw.bgColor === 'string') {
    if (!/^#[0-9a-fA-F]{6}$/.test(raw.bgColor)) {
      throw new BadRequestError('Tuỳ chọn không hợp lệ: bgColor phải là mã hex, vd #FFFFFF');
    }
    if (!options.removeBackground) {
      throw new BadRequestError('Tuỳ chọn không hợp lệ: bgColor chỉ dùng khi removeBackground = true');
    }
    options.bgColor = raw.bgColor;
  }
  if (Object.keys(options).length === 0) {
    throw new BadRequestError('Tuỳ chọn không hợp lệ');
  }
  return options;
}

const generateImage = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);

  const { sourceImageUrl } = req.body;
  const belongsToProduct = product.originalImages.some((img) => img.url === sourceImageUrl);
  if (!sourceImageUrl || !belongsToProduct) {
    throw new BadRequestError('Ảnh gốc không hợp lệ');
  }

  const options = sanitizeOptions(req.body.options || {});

  // Kiểm tra quota TRƯỚC khi gọi PhotoRoom — mục 5 chuc-nang-tao-anh-ai.md
  await quotaService.consumeQuota(req.user._id);

  const record = await GeneratedImage.create({
    userId: req.user._id,
    productId: product._id,
    sourceImageUrl,
    options,
    status: 'pending',
  });

  // Chỉ bọc try/catch quanh 2 bước có thể lỗi "thuộc về AI generation" (gọi
  // PhotoRoom / upload Cloudinary). record.save() ở nhánh thành công KHÔNG được đặt
  // trong try/catch này — nếu không, 1 lỗi ghi DB thoáng qua SAU KHI đã tạo ảnh
  // thành công sẽ bị nuốt vào catch và ghi đè record thành "failed", trong khi ảnh
  // kết quả đã được tạo & upload thật (mồ côi trên Cloudinary), user bị báo sai là
  // lỗi dù đã tốn 1 lượt quota.
  let buffer;
  let uploaded;
  try {
    ({ buffer } = await imageAiService.generate({ sourceImageUrl, options }));
    uploaded = await cloudinaryService.uploadResultImage(buffer);
  } catch (err) {
    record.status = 'failed';
    record.errorMessage =
      err instanceof ImageAiTimeoutError ? 'Hết thời gian chờ xử lý ảnh' : 'Không tạo được ảnh, vui lòng thử lại';
    await record.save();

    // Log lỗi thật ở server, không trả nguyên văn cho client — mục 9 chuc-nang-tao-anh-ai.md
    console.error('[generate-image] lỗi thật:', err);
    throw new UpstreamError(record.errorMessage);
  }

  record.resultImageUrl = uploaded.secure_url;
  record.resultImagePublicId = uploaded.public_id;
  record.status = 'success';
  await record.save();

  return res.json(record);
});

const listImages = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const [items, total] = await Promise.all([
    GeneratedImage.find({ productId: product._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    GeneratedImage.countDocuments({ productId: product._id }),
  ]);

  res.json({ items, total, page, limit });
});

const deleteImage = asyncHandler(async (req, res) => {
  const image = await GeneratedImage.findById(req.params.id);
  if (!image) throw new NotFoundError('Không tìm thấy ảnh');
  if (String(image.userId) !== String(req.user._id)) {
    throw new ForbiddenError('Không có quyền');
  }

  if (image.resultImagePublicId) {
    await cloudinaryService.deleteImage(image.resultImagePublicId);
  }
  await image.deleteOne();
  res.status(204).send();
});

module.exports = { generateImage, listImages, deleteImage };
