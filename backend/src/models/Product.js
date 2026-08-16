const mongoose = require('mongoose');

// originalImages lưu cả publicId (không chỉ url) để xoá được trên Cloudinary một cách
// đáng tin cậy — xem điểm còn thiếu đã nêu khi review chuc-nang-tao-anh-ai.md mục 8.3.
const originalImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    originalImages: {
      type: [originalImageSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'Sản phẩm cần ít nhất 1 ảnh gốc',
      },
    },
    // các field thông tin mở rộng (giá, danh mục...) — chưa chốt danh sách,
    // xem chuc-nang-tao-anh-ai.md mục 4 "placeholder field thông tin mở rộng".
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
