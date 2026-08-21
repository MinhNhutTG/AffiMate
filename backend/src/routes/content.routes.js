const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { deleteContent } = require('../controllers/content.controller');

router.delete('/:id', authenticate, deleteContent);

module.exports = router;
