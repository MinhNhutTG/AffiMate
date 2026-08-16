class AppError extends Error {
  constructor(message, statusCode, extra) {
    super(message);
    this.statusCode = statusCode;
    this.expose = true;
    this.extra = extra;
  }
}

class BadRequestError extends AppError {
  constructor(message, extra) {
    super(message, 400, extra);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message, extra) {
    super(message, 429, extra);
  }
}

class UpstreamError extends AppError {
  constructor(message) {
    super(message, 502);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UpstreamError,
};
