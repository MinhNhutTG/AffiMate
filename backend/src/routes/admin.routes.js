const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Product = require('../models/Product');
const GeneratedImage = require('../models/GeneratedImage');
const GeneratedContent = require('../models/GeneratedContent');
const { NotFoundError, BadRequestError } = require('../utils/errors');

router.use(authenticate, requireRole('admin'));

// Escape ký tự đặc biệt của regex trước khi đưa vào RegExp — search đến từ query
// param, không escape sẽ dính ReDoS (regex catastrophic backtracking) hoặc crash
// do cú pháp regex không hợp lệ (vd dấu ngoặc không cân).
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Thẻ số liệu tổng quan cho trang Admin — tailieubandau.md mục 6.
router.get('/stats', asyncHandler(async (req, res) => {
  const [totalUsers, bannedUsers, adminUsers, totalProducts, totalGeneratedImages, totalGeneratedContents] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: 'banned' }),
    User.countDocuments({ role: 'admin' }),
    Product.countDocuments({}),
    GeneratedImage.countDocuments({}),
    GeneratedContent.countDocuments({}),
  ]);

  res.json({ totalUsers, bannedUsers, adminUsers, totalProducts, totalGeneratedImages, totalGeneratedContents });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const search = req.query.search;
  const filter = search
    ? { $or: [{ email: new RegExp(escapeRegex(search), 'i') }, { name: new RegExp(escapeRegex(search), 'i') }] }
    : {};

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) throw new NotFoundError('Không tìm thấy user');
  res.json(user);
}));

router.put('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('Không tìm thấy user');

  const { role, status } = req.body;
  if (role && !['user', 'admin'].includes(role)) throw new BadRequestError('role không hợp lệ');
  if (status && !['active', 'banned'].includes(status)) throw new BadRequestError('status không hợp lệ');

  if (role) user.role = role;
  if (status) user.status = status;
  await user.save();

  res.json({ id: user._id, email: user.email, name: user.name, role: user.role, status: user.status });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('Không tìm thấy user');

  // Cùng chính sách an toàn với product.controller.js.remove(): chặn xoá nếu còn
  // dữ liệu con (Product) để tránh dữ liệu mồ côi (Product/GeneratedImage/ảnh
  // Cloudinary trỏ tới userId không còn tồn tại) — chưa có chính sách cascade chính
  // thức, xem chuc-nang-tao-anh-ai.md mục 11 câu 4 (áp dụng tương tự cho User).
  const productCount = await Product.countDocuments({ userId: user._id });
  if (productCount > 0) {
    throw new BadRequestError('User còn sản phẩm liên kết, chưa xoá được — cần chính sách xoá rõ ràng trước');
  }

  await user.deleteOne();
  res.status(204).send();
}));

module.exports = router;
