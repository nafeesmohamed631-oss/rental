import express from 'express';
import Razorpay from 'razorpay';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: `smartrent_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    console.log('Razorpay Order:', order);

    res.status(200).json({
      success: true,
      order,
    });

  } catch (error) {
    console.error('Razorpay Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order',
    });
  }
});

export default router;