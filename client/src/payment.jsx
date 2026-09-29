import React, { useState } from 'react';
import axios from 'axios';

const RAZORPAY_KEY =
  import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_TWtdNerIsAqzSE';

function Payment() {
  const [amount, setAmount] = useState('');

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      // Prevent loading the script multiple times
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');

      script.src = 'https://checkout.razorpay.com/v1/checkout.js';

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      // Load Razorpay
      const razorpayLoaded = await loadRazorpay();

      if (!razorpayLoaded) {
        alert('Razorpay SDK failed to load');
        return;
      }

      // Create order from backend
      const response = await axios.post(
        'http://localhost:5000/api/payment/create-order',
        {
          amount: Number(amount),
        }
      );

      console.log('Backend response:', response.data);

      const order = response.data.order;

      if (!order || !order.id) {
        alert('Failed to create Razorpay order');
        return;
      }

      // Razorpay Checkout options
      const options = {
        key: RAZORPAY_KEY,

        amount: order.amount,

        currency: order.currency,

        name: 'SmartRent',

        description: 'SmartRent Rental Payment',

        order_id: order.id,

        handler: function (response) {
          console.log('Payment Success:', response);

          alert('Payment Successful!');

          console.log('Payment ID:', response.razorpay_payment_id);
          console.log('Order ID:', response.razorpay_order_id);
          console.log('Signature:', response.razorpay_signature);
        },

        prefill: {
          name: 'SmartRent User',
          email: 'user@example.com',
          contact: '9999999999',
        },

        theme: {
          color: '#3399cc',
        },
      };

      const razorpay = new window.Razorpay(options);

      // Payment failure event
      razorpay.on('payment.failed', function (response) {
        console.error('Payment Failed:', response.error);

        alert(
          `Payment Failed: ${response.error.description || 'Unknown error'}`
        );
      });

      razorpay.open();

    } catch (error) {
      console.error(
        'Payment Error:',
        error.response?.data || error.message
      );

      alert('Unable to create payment order');
    }
  };

  return (
    <div>
      <h2>SmartRent Payment</h2>

      <input
        type="number"
        placeholder="Enter Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button onClick={handlePayment}>
        Pay Now
      </button>
    </div>
  );
}

export default Payment;