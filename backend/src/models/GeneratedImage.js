const mongoose = require('mongoose');

const generatedImageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    provider: { type: String, default: 'photoroom' },
    // 1 trong các originalImages.url của product tại thời điểm tạo — mục 4 chuc-nang-tao-anh-ai.md
    sourceImageUrl: { type: String, required: true },
    options: { type: Object, default: {} },
    resultImageUrl: String,
    resultImagePublicId: String,
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    errorMessage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeneratedImage', generatedImageSchema);
