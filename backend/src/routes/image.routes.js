const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { deleteImage } = require('../controllers/image.controller');

router.delete('/:id', authenticate, deleteImage);

module.exports = router;
