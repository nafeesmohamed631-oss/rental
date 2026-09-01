import mongoose from 'mongoose';
export default mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  productCount: { type: Number, default: 1 },
  description: String,
  pricePerDay: { type: Number, required: true },
  image: String,
  condition: String,
  location: String,
  availableFrom: Date,
  availableTo: Date,
  status: { type: String, enum: ['available', 'rented', 'inactive'], default: 'available' }
}, { timestamps: true }));
