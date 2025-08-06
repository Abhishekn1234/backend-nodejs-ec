const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();


const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};


router.post('/register', async (req, res) => {
  const { name, mobile, password } = req.body;

  const existingUser = await User.findOne({ mobile });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  
  const isAdmin = name.toLowerCase().startsWith('admin');

  const newUser = await User.create({ name, mobile, password, isAdmin });

  res.status(201).json({
    _id: newUser._id,
    name: newUser.name,
    mobile: newUser.mobile,
    isAdmin: newUser.isAdmin,
    token: generateToken(newUser),
  });
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

module.exports = router;
