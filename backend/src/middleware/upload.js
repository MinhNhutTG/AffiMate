const multer = require('multer');
const { BadRequestError } = require('../utils/errors');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// mục 3.1 chuc-nang-tao-anh-ai.md — 10MB/ảnh, tối đa 5 ảnh/sản phẩm (đề xuất, chưa chốt số ảnh)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new BadRequestError('Định dạng ảnh không hợp lệ (chỉ nhận jpg/png/webp)'));
    }
    cb(null, true);
  },
});

module.exports = { upload, MAX_FILES, MAX_FILE_SIZE };
