const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const { toPublicUser } = require('../utils/publicUser');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    throw new BadRequestError('Thiếu email, mật khẩu hoặc tên');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Dựa vào unique index của email (không check-rồi-tạo riêng lẻ) để tránh race
  // condition: 2 request đăng ký cùng email gần như đồng thời đều có thể vượt qua
  // 1 bước findOne kiểm tra trước, dẫn tới User.create ném lỗi trùng key (code
  // 11000) không được xử lý — rơi vào nhánh 500 chung thay vì 400 rõ ràng.
  let user;
  try {
    user = await User.create({ email, passwordHash, name });
  } catch (err) {
    if (err.code === 11000) {
      throw new BadRequestError('Email đã được sử dụng');
    }
    throw err;
  }

  res.status(201).json({ accessToken: signToken(user), user: toPublicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  const passwordOk = user && (await bcrypt.compare(password || '', user.passwordHash));
  if (!user || !passwordOk) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng');
  }
  if (user.status !== 'active') {
    throw new UnauthorizedError('Tài khoản đã bị khoá');
  }

  res.json({ accessToken: signToken(user), user: toPublicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json(toPublicUser(req.user));
});

module.exports = { register, login, me };
