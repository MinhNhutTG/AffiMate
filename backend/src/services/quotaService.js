const User = require('../models/User');
const { TooManyRequestsError } = require('../utils/errors');

// mục 5 chuc-nang-tao-anh-ai.md — biến môi trường để chỉnh không cần sửa code
const DAILY_LIMIT = Number(process.env.DAILY_IMAGE_GEN_LIMIT || 10);
const VN_TZ = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MINUTES = 7 * 60; // Asia/Ho_Chi_Minh không có DST, lệch cố định UTC+7

function todayVN() {
  // 'YYYY-MM-DD' theo giờ VN — dùng timeZone option nên không phụ thuộc TZ hệ điều
  // hành server.
  return new Date().toLocaleDateString('en-CA', { timeZone: VN_TZ });
}

function resetAtVN() {
  // Dịch "now" sang khung giờ VN (đọc field UTC ra sẽ đúng số giờ VN), tính mốc
  // nửa đêm tiếp theo trong khung đó, rồi dịch ngược lại để có đúng instant UTC
  // thật. KHÔNG dùng cách "toLocaleString rồi new Date(string)" vì new Date() parse
  // string kiểu này theo timezone của HỆ ĐIỀU HÀNH server, sai lệch nếu server
  // không chạy ở giờ VN (vd server chạy UTC ở production — resetAt sẽ lệch 7 tiếng).
  const now = new Date();
  const shifted = new Date(now.getTime() + VN_OFFSET_MINUTES * 60000);
  shifted.setUTCHours(24, 0, 0, 0);
  return new Date(shifted.getTime() - VN_OFFSET_MINUTES * 60000).toISOString();
}

// Tăng count bằng lệnh atomic (findOneAndUpdate có điều kiện) để tránh race condition
// khi nhiều request đồng thời — điểm đã lưu ý khi review chuc-nang-tao-anh-ai.md mục 5.
//
// Có 2 nhánh update atomic (tăng count / reset ngày mới), nên cần retry: nếu 1 request
// đang ở nhánh "reset ngày mới" bị 1 request khác chạy trước giành mất (đã đổi date
// sang hôm nay rồi), request này phải thử lại nhánh "tăng count" chứ không được kết
// luận ngay là hết quota — nếu không sẽ báo hết quota sai cho request đến sau dù
// count thật sự vẫn còn dư.
async function consumeQuota(userId) {
  const today = todayVN();
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let user = await User.findOneAndUpdate(
      { _id: userId, 'imageGenUsage.date': today, 'imageGenUsage.count': { $lt: DAILY_LIMIT } },
      { $inc: { 'imageGenUsage.count': 1 } },
      { new: true }
    );
    if (user) return user;

    user = await User.findOneAndUpdate(
      { _id: userId, 'imageGenUsage.date': { $ne: today } },
      { $set: { 'imageGenUsage.date': today, 'imageGenUsage.count': 1 } },
      { new: true }
    );
    if (user) return user;

    // Cả 2 nhánh đều không match — xác nhận lại đúng lý do trước khi báo hết quota:
    // có thể count thật sự đã chạm limit, hoặc chỉ là thua 1 request khác vừa đổi
    // date sang hôm nay (nhánh "reset" phía trên) — trường hợp sau thì thử lại vòng lặp.
    const current = await User.findById(userId).select('imageGenUsage');
    const usage = current && current.imageGenUsage;
    if (usage && usage.date === today && usage.count >= DAILY_LIMIT) {
      throw new TooManyRequestsError('Đã hết lượt tạo ảnh hôm nay', { resetAt: resetAtVN() });
    }
    // Ngược lại: thua race condition, thử lại ngay.
  }

  throw new TooManyRequestsError('Đã hết lượt tạo ảnh hôm nay', { resetAt: resetAtVN() });
}

module.exports = { consumeQuota, DAILY_LIMIT };
