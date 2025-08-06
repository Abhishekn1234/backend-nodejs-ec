const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./db');
const authRoutes = require('./routes/User');
const productRoutes = require('./routes/Products');
const orderRoutes = require('./routes/Orders');
const cors=require('cors');
dotenv.config();
connectDB();
app.get('/', (req, res) => {
  res.send('Hello from Render!');
});
const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
