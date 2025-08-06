const Order = require('../models/Order');
const Product = require('../models/Product');
exports.getAdminData = (req, res) => {
  res.json({ message: 'Admin data route working' });
};


exports.getLowStock = async (req, res) => {
  try {
    const lowStockItems = await Product.find({ stock: { $lte: 10 } });
    res.json(lowStockItems);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getAnalytics = async (req, res) => {
  try {
    const orders = await Order.find();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      totalOrders,
      totalRevenue,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
exports.placeOrder = async (req, res) => {
  const { products } = req.body;

  let total = 0;
  for (const item of products) {
    const product = await Product.findById(item.product);
    if (!product || product.stock < item.quantity) {
      return res.status(400).json({ message: 'Product unavailable or insufficient stock.' });
    }
    total += product.price * item.quantity;
    product.stock -= item.quantity;
    await product.save();
  }

  const order = new Order({
    user: req.user._id,
    products,
    totalAmount: total,
  });

  await order.save();
  res.status(201).json(order);
};

exports.getUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate('products.product');
  res.json(orders);
};

exports.getAllOrders = async (req, res) => {
  const orders = await Order.find().populate('user').populate('products.product');
  res.json(orders);
};

exports.updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.status = req.body.status;
    await order.save();
    res.json(order);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
};
