const mongoose = require('mongoose');

const generatedContentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    provider: { type: String, default: 'cloudflare' },
    tone: { type: String, enum: ['gan-gui', 'hai-huoc', 'chuyen-nghiep'], default: 'gan-gui' },
    hook: String,
    body: String,
    cta: String,
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    errorMessage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeneratedContent', generatedContentSchema);
