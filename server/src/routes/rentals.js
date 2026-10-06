import express from 'express';
import Rental from '../models/Rental.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { auth, adminOnly } from '../middleware/auth.js';
import {
  sendAdminRentalRequestEmail,
  sendUserRentalStatusEmail,
  sendDamageNotification,
  verifyActionToken
} from '../services/emailService.js';

const r = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// -------------------------------------------------------------
// Direct Email Action (Approve / Reject clicked in Admin's Gmail)
// -------------------------------------------------------------
r.get('/email-action', async (req, res) => {
  const { action, id, token } = req.query;

  if (!action || !id || !token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #ef4444;">Invalid Request</h2>
        <p>The action link is missing required parameters.</p>
        <a href="${CLIENT_URL}/admin/requests" style="color: #3b82f6;">Go to Admin Dashboard</a>
      </body>
      </html>
    `);
  }

  const payload = verifyActionToken(token);
  if (!payload || payload.rentalId !== id || payload.action !== action) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #ef4444;">Action Link Expired or Invalid</h2>
        <p>This security token has expired or is invalid.</p>
        <a href="${CLIENT_URL}/admin/requests" style="color: #3b82f6;">Go to Admin Dashboard</a>
      </body>
      </html>
    `);
  }

  try {
    const rental = await Rental.findById(id).populate('product').populate('user', 'username email');
    if (!rental) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">Rental Not Found</h2>
          <p>The requested rental record could not be found.</p>
          <a href="${CLIENT_URL}/admin/requests" style="color: #3b82f6;">Go to Admin Dashboard</a>
        </body>
        </html>
      `);
    }

    // Apply status update
    rental.status = action; // 'approved' or 'rejected'
    await rental.save();

    if (action === 'approved' && rental.product) {
      await Product.findByIdAndUpdate(rental.product._id, { status: 'rented' });
    } else if (action === 'rejected' && rental.product) {
      await Product.findByIdAndUpdate(rental.product._id, { status: 'available' });
    }

    // Notify user via Email and In-App notification
    await sendUserRentalStatusEmail(rental, rental.user, rental.product, action);

    const isApproved = action === 'approved';
    const color = isApproved ? '#10b981' : '#ef4444';
    const title = isApproved ? 'Rental Approved Successfully!' : 'Rental Request Declined';
    const redirectUrl = `${CLIENT_URL}/admin/requests?actionSuccess=${action}&id=${rental._id}&uniqueId=${rental.uniqueId}`;

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} - SmartRent</title>
        <meta http-equiv="refresh" content="3;url=${redirectUrl}">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
          .badge { display: inline-block; background: ${color}; color: #fff; padding: 8px 16px; border-radius: 9999px; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 16px; }
          h2 { margin: 0 0 12px; color: #ffffff; font-size: 24px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .btn { display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">${action.toUpperCase()}</div>
          <h2>${title}</h2>
          <p>
            Rental Order <strong>#${rental.uniqueId || rental._id}</strong> for <strong>${rental.product?.title || 'Product'}</strong> is now <strong>${action}</strong>.
            The user has been notified.
          </p>
          <p style="font-size: 13px; color: #64748b;">Redirecting to Admin Requests in 3 seconds...</p>
          <a href="${redirectUrl}" class="btn">Go to Dashboard Now &rarr;</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error handling email action:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #ef4444;">Server Error</h2>
        <p>An unexpected error occurred: ${err.message}</p>
        <a href="${CLIENT_URL}/admin/requests" style="color: #3b82f6;">Go to Admin Dashboard</a>
      </body>
      </html>
    `);
  }
});

// -------------------------------------------------------------
// Create rental request (User)
// -------------------------------------------------------------
r.post('/', auth, async (req, res) => {
  const { product, days, mobile, upiId, startDate, endDate, uniqueId } = req.body;
  if (days < 1 || days > 7) return res.status(400).json({ message: 'Choose 1–7 days' });
  const p = await Product.findById(product);
  if (!p || p.status !== 'available') return res.status(400).json({ message: 'Product unavailable' });
  
  let rentalId = uniqueId || `IDX${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
  while (await Rental.exists({ uniqueId: rentalId })) {
    rentalId = `IDX${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
  }

  const rental = await Rental.create({
    uniqueId: rentalId,
    user: req.user.id,
    product,
    startDate: startDate || new Date(),
    endDate: endDate || new Date(Date.now() + days * 86400000),
    days,
    mobile,
    upiId,
    totalAmount: p.pricePerDay * days
  });

  const populatedRental = await Rental.findById(rental._id).populate('product').populate('user', 'username email');
  const user = await User.findById(req.user.id);

  // Send real-time email to Admin with Accept / Reject buttons
  sendAdminRentalRequestEmail(populatedRental, user, p).catch(err => {
    console.error('Error sending admin notification email:', err);
  });
  
  res.status(201).json(populatedRental);
});

// -------------------------------------------------------------
// Get user's own rentals
// -------------------------------------------------------------
r.get('/mine', auth, async (req, res) => {
  res.json(await Rental.find({ user: req.user.id }).populate('product').sort({ createdAt: -1 }));
});

// -------------------------------------------------------------
// Admin: Get all rentals
// -------------------------------------------------------------
r.get('/', auth, adminOnly, async (req, res) => {
  res.json(await Rental.find().populate('user', 'username email').populate('product').sort({ createdAt: -1 }));
});

// -------------------------------------------------------------
// Admin: Update status (approved / rejected / returned)
// -------------------------------------------------------------
r.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const allowedStatuses = ['approved', 'rejected', 'returned'];
  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ message: 'Invalid rental status' });
  }

  const x = await Rental.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    .populate('product')
    .populate('user', 'username email');
    
  if (!x) return res.status(404).json({ message: 'Rental not found' });
  
  if (req.body.status === 'approved') await Product.findByIdAndUpdate(x.product._id, { status: 'rented' });
  if (req.body.status === 'returned') await Product.findByIdAndUpdate(x.product._id, { status: 'available' });

  // Send user update email and notification
  sendUserRentalStatusEmail(x, x.user, x.product, req.body.status).catch(err => {
    console.error('Error sending user rental status email:', err);
  });

  res.json(x);
});

// -------------------------------------------------------------
// Admin: Edit rental dates or mobile/user details
// -------------------------------------------------------------
r.put('/:id', auth, adminOnly, async (req, res) => {
  const { startDate, endDate, mobile, uniqueId } = req.body;
  const updateData = {};
  if (startDate) updateData.startDate = startDate;
  if (endDate) updateData.endDate = endDate;
  if (mobile) updateData.mobile = mobile;
  if (uniqueId) updateData.uniqueId = uniqueId;

  const updated = await Rental.findByIdAndUpdate(req.params.id, updateData, { new: true })
    .populate('user', 'username email')
    .populate('product');

  if (updated && updated.user) {
    await Notification.create({
      user: updated.user._id,
      forAdmin: false,
      title: `Rental #${updated.uniqueId} Details Updated`,
      message: `Admin updated details/dates for "${updated.product?.name || 'Item'}". Rental is scheduled from ${new Date(updated.startDate).toLocaleDateString()} to ${new Date(updated.endDate).toLocaleDateString()}.`,
      type: 'info',
      rental: updated._id,
      uniqueId: updated.uniqueId,
    });
  }

  res.json(updated);
});

// -------------------------------------------------------------
// Admin: Report / Update Damage details
// -------------------------------------------------------------
r.patch('/:id/damage', auth, adminOnly, async (req, res) => {
  const { isDamaged, damageDetails, damageCost } = req.body;
  const rental = await Rental.findByIdAndUpdate(
    req.params.id,
    {
      damageReport: {
        isDamaged: Boolean(isDamaged),
        damageDetails: damageDetails || '',
        damageCost: Number(damageCost) || 0,
        reportedAt: new Date()
      }
    },
    { new: true }
  ).populate('user', 'username email').populate('product');

  if (rental) {
    sendDamageNotification(rental, rental.user, rental.product, rental.damageReport).catch(err => {
      console.error('Error dispatching damage notification:', err);
    });
  }

  res.json(rental);
});

export default r;
