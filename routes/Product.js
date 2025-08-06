const Product = require('../models/Product');
const mongoose=require('mongoose');
exports.getAllProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

exports.createProduct = async (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const image = req.file ? req.file.filename : null;

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
};


exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const { name, description, price, stock, category } = req.body;
    const updateData = { name, description, price, stock, category };

    if (req.file) {
      updateData.image = req.file.filename;
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

exports.deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
};
