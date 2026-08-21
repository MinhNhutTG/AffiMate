// Tạo/nâng cấp tài khoản admin đầu tiên — chỉ chạy thủ công từ máy có quyền
// truy cập MONGODB_URI, KHÔNG lộ ra endpoint HTTP nào (tự cấp quyền admin qua
// mạng là lỗ hổng bảo mật) — xem thảo luận Admin UI trong tailieubandau.md mục 6.
//
// Cách dùng:
//   node scripts/createAdmin.js <email> [password] [name]
//
// - Nếu email đã tồn tại: nâng role lên 'admin' (và mở lại status='active' nếu
//   đang bị khoá), không đổi mật khẩu hiện tại dù có truyền password.
// - Nếu email chưa tồn tại: tạo user mới với role='admin' — bắt buộc phải có
//   password (>= 6 ký tự, khớp yêu cầu ở RegisterPage.jsx).

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function main() {
  const [email, password, name] = process.argv.slice(2);

  if (!email) {
    console.error('Thiếu email.\nCách dùng: node scripts/createAdmin.js <email> [password] [name]');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    existing.role = 'admin';
    existing.status = 'active';
    await existing.save();
    console.log(`Đã nâng "${existing.email}" (${existing.name}) lên role=admin.`);
  } else {
    if (!password || password.length < 6) {
      console.error('User chưa tồn tại — cần truyền password (>= 6 ký tự) để tạo mới.\nCách dùng: node scripts/createAdmin.js <email> <password> [name]');
      process.exitCode = 1;
      await mongoose.disconnect();
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: name || 'Admin',
      role: 'admin',
    });
    console.log(`Đã tạo admin mới: ${created.email} (${created.name}).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Lỗi:', err.message);
  process.exitCode = 1;
  mongoose.disconnect();
});
