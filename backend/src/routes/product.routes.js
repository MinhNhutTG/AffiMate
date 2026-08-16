const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload, MAX_FILES } = require('../middleware/upload');
const productController = require('../controllers/product.controller');
const imageController = require('../controllers/image.controller');

router.use(authenticate);

router.post('/', upload.array('images', MAX_FILES), productController.create);
router.get('/', productController.list);
router.get('/:id', productController.detail);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

// Ảnh AI — mục 4/8 kientruc-ky-thuat.md & chuc-nang-tao-anh-ai.md
router.post('/:id/generate-image', imageController.generateImage);
router.get('/:id/images', imageController.listImages);

module.exports = router;
