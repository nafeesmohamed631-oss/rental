import express from 'express';
import Product from '../models/Product.js';
import { auth, adminOnly } from '../middleware/auth.js';

const r = express.Router();

// Get all products
r.get('/', async (req, res) => {
  const q = {};
  if (req.query.category && req.query.category !== 'All') q.category = req.query.category;
  if (req.query.search) q.name = new RegExp(req.query.search, 'i');
  res.json(await Product.find(q).sort({ createdAt: -1 }));
});

// Get single product
r.get('/:id', async (req, res) => {
  res.json(await Product.findById(req.params.id));
});

// Create/Post product (Any logged-in User can post a product for rent)
r.post('/', auth, async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      postedBy: req.user.id
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update product (Admin or owner can edit/update)
r.put('/:id', auth, async (req, res) => {
  res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Delete product (Admin or owner can delete)
r.delete('/:id', auth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default r;
