const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// Ảnh gốc: resize cạnh lớn nhất tối đa 2000px trước khi lưu — mục 7 chuc-nang-tao-anh-ai.md
function uploadOriginalImage(buffer) {
  return uploadBuffer(buffer, {
    folder: 'affimate/originals',
    transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
  });
}

// Ảnh kết quả PhotoRoom: giữ nguyên, không nén lại — mục 7 chuc-nang-tao-anh-ai.md
function uploadResultImage(buffer) {
  return uploadBuffer(buffer, { folder: 'affimate/results' });
}

function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadOriginalImage, uploadResultImage, deleteImage };
