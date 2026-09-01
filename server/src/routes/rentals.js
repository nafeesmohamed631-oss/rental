import express from 'express';
import Rental from '../models/Rental.js';
import Product from '../models/Product.js';
import { auth, adminOnly } from '../middleware/auth.js';

const r = express.Router();

// Create rental request
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
  
  res.status(201).json(rental);
});

// Get user's own rentals
r.get('/mine', auth, async (req, res) => {
  res.json(await Rental.find({ user: req.user.id }).populate('product').sort({ createdAt: -1 }));
});

// Admin: Get all rentals
r.get('/', auth, adminOnly, async (req, res) => {
  res.json(await Rental.find().populate('user', 'username email').populate('product').sort({ createdAt: -1 }));
});

// Admin: Update status (approved / rejected / returned)
r.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const allowedStatuses = ['approved', 'rejected', 'returned'];
  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ message: 'Invalid rental status' });
  }

  const x = await Rental.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate('product').populate('user', 'username email');
  if (!x) return res.status(404).json({ message: 'Rental not found' });
  if (req.body.status === 'approved') await Product.findByIdAndUpdate(x.product._id, { status: 'rented' });
  if (req.body.status === 'returned') await Product.findByIdAndUpdate(x.product._id, { status: 'available' });
  res.json(x);
});

// Admin: Edit rental dates or mobile/user details
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
  res.json(updated);
});

// Admin: Report / Update Damage details
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

  res.json(rental);
});

export default r;
