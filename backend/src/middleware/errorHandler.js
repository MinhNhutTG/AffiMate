const multer = require('multer');

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Ảnh vượt quá dung lượng cho phép (tối đa 10MB/ảnh)',
  LIMIT_FILE_COUNT: 'Vượt quá số lượng ảnh cho phép',
  LIMIT_UNEXPECTED_FILE: 'Trường ảnh không hợp lệ',
};

// Không trả nguyên văn lỗi kỹ thuật cho client — mục 9 chuc-nang-tao-anh-ai.md
function errorHandler(err, req, res, next) {
  // MulterError (vượt dung lượng/số lượng file...) không có statusCode/expose như
  // AppError, nếu không map riêng sẽ rơi vào nhánh 500 dù đây là lỗi input của client.
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: MULTER_MESSAGES[err.code] || 'Lỗi khi upload ảnh' });
  }

  const status = err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    message: err.expose ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại',
    ...(err.extra || {}),
  });
}

module.exports = { errorHandler };
