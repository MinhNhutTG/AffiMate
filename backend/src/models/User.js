const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'banned'], default: 'active' },
    plan: { type: String, enum: ['free', 'paid'], default: 'free' },
    // quota tạo ảnh AI — mục 4/5 chuc-nang-tao-anh-ai.md, reset tự nhiên khi date đổi
    imageGenUsage: {
      date: { type: String, default: '' }, // 'YYYY-MM-DD' theo giờ VN
      count: { type: Number, default: 0 },
    },
    // quota tạo nội dung/kịch bản AI — cùng cơ chế với imageGenUsage
    contentGenUsage: {
      date: { type: String, default: '' },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
