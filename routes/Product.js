const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err.message });
  }
};

// Get product statistics
exports.getProductStats = async (req, res) => {
  try {
    const total = await Product.countDocuments();
    const lowStock = await Product.countDocuments({ stock: { $lte: 10 } });

    res.json({ total, lowStock });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const image = req.file ? `uploads/${req.file.filename}` : null;

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      image,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error creating product', error: err.message });
  }
};

// Update an existing product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const { name, description, price, stock, category } = req.body;
    const updateData = { name, description, price, stock, category };

    if (req.file) {
      updateData.image = `uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(productId, updateData, { new: true });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
};
