const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UnauthorizedError } = require('../utils/errors');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedError('Thiếu token xác thực');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('Tài khoản không hợp lệ hoặc đã bị khoá');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token không hợp lệ hoặc đã hết hạn'));
    }
    next(err);
  }
}

module.exports = { authenticate };
