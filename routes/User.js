const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { protect, admin } = require('../auth');

const router = express.Router();


const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};


router.post('/register', async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    // Basic input validation
    if (!name || !mobile || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const isAdmin = name.toLowerCase().startsWith('admin');

    const newUser = await User.create({ name, mobile, password, isAdmin });

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      mobile: newUser.mobile,
      isAdmin: newUser.isAdmin,
      token: generateToken(newUser),
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});



router.post('/login', async (req, res) => {
  const { mobile, password } = req.body;

  const user = await User.findOne({ mobile });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid mobile or password' });
  }

  res.json({
    _id: user._id,
    name: user.name,
    mobile: user.mobile,
    isAdmin: user.isAdmin,
    token: generateToken(user),
  });
});
router.get('/users-with-stats', protect, admin, async (req, res) => {
  try {
    const users = await User.find();

    const orders = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    const registrationSources = await User.aggregate([
      {
        $group: {
          _id: '$registrationSource',
          count: { $sum: 1 }
        }
      }
    ]);

    const orderStatusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersCount = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    });

    const usersWithOrders = await Order.distinct('user');
    const usersWithOrdersCount = usersWithOrders.length;

    const response = {
      users: users.map(user => {
        const userOrders = orders.find(o => String(o._id) === String(user._id));
        return {
          ...user.toObject(),
          orderCount: userOrders?.orderCount || 0,
          totalSpent: userOrders?.totalSpent || 0,
          lastOrderDate: userOrders?.lastOrderDate || null
        };
      }),
      stats: {
        totalUsers: users.length,
        activeUsers: activeUsersCount,
        usersWithOrders: usersWithOrdersCount,
        registrationSources: registrationSources.reduce((acc, curr) => {
          acc[curr._id || 'web'] = curr.count;
          return acc;
        }, {}),
        orderStatusDistribution: orderStatusDistribution.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      recentOrders: await Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user')
        .populate('products.product')
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Detailed analytics
router.get('/analytics', protect, admin, async (req, res) => {
  try {
    const registrationOverTime = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);

    const userActivity = await User.aggregate([
      {
        $project: {
          month: { $month: '$lastLogin' },
          active: { $cond: [{ $gte: ['$lastLogin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] }
        }
      },
      {
        $group: {
          _id: '$month',
          activeUsers: { $sum: '$active' },
          totalUsers: { $sum: 1 }
        }
      }
    ]);

    const orderValueDistribution = await Order.aggregate([
      {
        $bucket: {
          groupBy: '$totalAmount',
          boundaries: [0, 500, 1000, 1500, 2000, 3000, 5000],
          default: '5000+',
          output: {
            count: { $sum: 1 },
            average: { $avg: '$totalAmount' }
          }
        }
      }
    ]);

    res.json({
      registrationOverTime,
      userActivity,
      orderValueDistribution
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user details
router.get('/:userId', protect, admin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const orders = await Order.find({ user: req.params.userId })
      .populate('products.product')
      .sort({ createdAt: -1 });

    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const favoriteProducts = await getFavoriteProducts(req.params.userId);

    res.json({
      user,
      orderCount: orders.length,
      totalSpent,
      averageOrderValue: orders.length > 0 ? (totalSpent / orders.length).toFixed(2) : 0,
      favoriteProducts,
      orders: orders.slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper: Favorite Products
async function getFavoriteProducts(userId) {
  const result = await Order.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $unwind: '$products' },
    {
      $group: {
        _id: '$products.product',
        count: { $sum: '$products.quantity' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 3 }
  ]);

  const productIds = result.map(item => item._id);
  const products = await Product.find({ _id: { $in: productIds } });

  return result.map(item => {
    const product = products.find(p => p._id.equals(item._id));
    return {
      product: product || { name: 'Unknown Product' },
      count: item.count
    };
  });
}


module.exports = router;
