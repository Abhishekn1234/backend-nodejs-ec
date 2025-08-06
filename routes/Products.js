const express = require('express');
const router = express.Router();
const {
  getAllProducts, createProduct, updateProduct, deleteProduct,
} = require('./Product');
const { protect, admin } = require('../auth');
const upload = require('./file');
router.get('/', getAllProducts);
router.post('/', protect, admin, upload.single('image'),  createProduct);
router.put('/:id', protect, admin, upload.single('image'),  updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;
