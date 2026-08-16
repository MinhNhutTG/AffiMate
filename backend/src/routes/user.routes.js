const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { toPublicUser } = require('../utils/publicUser');

router.use(authenticate);

router.get('/me', asyncHandler(async (req, res) => {
  res.json(toPublicUser(req.user));
}));

router.put('/me', asyncHandler(async (req, res) => {
  if (req.body.name !== undefined) req.user.name = req.body.name;
  await req.user.save();
  res.json(toPublicUser(req.user));
}));

module.exports = router;
