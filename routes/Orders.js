const express = require('express');
const router = express.Router();
const { protect, admin } = require('../auth');
const {
  placeOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,getAdminData,getLowStock,getAnalytics
} = require('./Order');

router.post('/', protect, placeOrder);
router.get('/my', protect, getUserOrders);
router.get('/', protect, admin, getAllOrders);
router.put('/:id', protect, admin, updateOrderStatus);
router.get('/data', protect,admin, getAdminData);
router.get('/low-stock', protect, admin, getLowStock);
router.get('/analytics', protect, admin, getAnalytics);
module.exports = router;
