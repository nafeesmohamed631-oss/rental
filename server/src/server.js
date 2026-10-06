import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';


import { connectDB } from './config/db.js';
import auth from './routes/auth.js';
import products from './routes/products.js';
import rentals from './routes/rentals.js';
import payment from './routes/payment.js';
import notifications from './routes/notifications.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
);

app.use(express.json());

// Razorpay configuration


// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Existing routes
app.use('/api/auth', auth);
app.use('/api/products', products);
app.use('/api/rentals', rentals);
app.use('/api/payment', payment);
app.use('/api/notifications', notifications);

// Start server
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log('SmartRent API on 5000');
  });
});