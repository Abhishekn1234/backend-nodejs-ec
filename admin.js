const Product = require('../models/Product');

exports.getLowStock = async (req, res) => {
  const lowStockItems = await Product.find({ stock: { $lt: 10 } });
  res.json(lowStockItems);
};
const Order = require('../models/Order');

exports.getAnalytics = async (req, res) => {
  const orders = await Order.find();
  const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalOrders = orders.length;

  res.json({ totalRevenue, totalOrders });
};
