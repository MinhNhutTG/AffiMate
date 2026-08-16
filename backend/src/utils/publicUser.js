// Dùng chung cho auth.controller.js và user.routes.js để tránh 2 nơi định nghĩa
// trùng lặp rồi lệch nhau khi có field mới cần thêm/bớt sau này.
function toPublicUser(user) {
  return { id: user._id, email: user.email, name: user.name, role: user.role, plan: user.plan };
}

module.exports = { toPublicUser };
