const Product = require('../models/Product');
const GeneratedImage = require('../models/GeneratedImage');
const cloudinaryService = require('../services/cloudinaryService');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

async function loadOwnedProduct(req) {
  const product = await Product.findById(req.params.id);
  if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');
  if (String(product.userId) !== String(req.user._id)) {
    throw new ForbiddenError('Không có quyền');
  }
  return product;
}

const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new BadRequestError('Thiếu tên sản phẩm');
  if (!req.files || req.files.length === 0) {
    throw new BadRequestError('Cần ít nhất 1 ảnh sản phẩm');
  }

  const uploads = await Promise.all(
    req.files.map((file) => cloudinaryService.uploadOriginalImage(file.buffer))
  );

  const product = await Product.create({
    userId: req.user._id,
    name,
    description,
    originalImages: uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id })),
  });

  res.status(201).json(product);
});

const list = asyncHandler(async (req, res) => {
  const products = await Product.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(products);
});

const detail = asyncHandler(async (req, res) => {
  res.json(await loadOwnedProduct(req));
});

// Chỉ sửa name/description — KHÔNG cho đổi originalImages ở MVP, xem
// chuc-nang-tao-anh-ai.md mục 3.3 (sửa thông tin không ảnh hưởng luồng tạo ảnh AI).
const update = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);
  const { name, description } = req.body;
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  await product.save();
  res.json(product);
});

const remove = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);

  // Chính sách xoá Product khi còn GeneratedImage liên quan CHƯA được chốt
  // (chuc-nang-tao-anh-ai.md mục 11, câu 4) — tạm chặn xoá làm mặc định an toàn,
  // dễ đảo ngược hơn cascade delete. Cần xác nhận lại trước khi lên production.
  const relatedCount = await GeneratedImage.countDocuments({ productId: product._id });
  if (relatedCount > 0) {
    throw new BadRequestError(
      'Sản phẩm còn ảnh AI đã tạo, chưa xoá được — chính sách xoá cần được xác nhận (xem chuc-nang-tao-anh-ai.md mục 11, câu 4)'
    );
  }

  // allSettled thay vì all: 1 ảnh xoá lỗi trên Cloudinary (vd lỗi mạng thoáng qua)
  // không được để chặn việc xoá Product — nếu không sẽ kẹt ở trạng thái vừa mất vài
  // ảnh gốc trên Cloudinary vừa không xoá được Product. Lỗi xoá ảnh chỉ log lại để
  // dọn tay/dọn nền sau, không chặn thao tác chính user yêu cầu.
  const results = await Promise.allSettled(
    product.originalImages.map((img) => cloudinaryService.deleteImage(img.publicId))
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(
        `[product.remove] Không xoá được ảnh Cloudinary publicId=${product.originalImages[i].publicId}:`,
        result.reason
      );
    }
  });

  await product.deleteOne();
  res.status(204).send();
});

module.exports = { create, list, detail, update, remove, loadOwnedProduct };
