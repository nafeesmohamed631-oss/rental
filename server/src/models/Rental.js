import mongoose from 'mongoose';
export default mongoose.model('Rental', new mongoose.Schema({
  uniqueId: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  startDate: Date,
  endDate: Date,
  days: { type: Number, min: 1, max: 7 },
  totalAmount: Number,
  mobile: String,
  upiId: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'returned'], default: 'pending' },
  paymentStatus: { type: String, default: 'demo_paid' },
  damageReport: {
    isDamaged: { type: Boolean, default: false },
    damageDetails: { type: String, default: '' },
    damageCost: { type: Number, default: 0 },
    reportedAt: Date
  }
}, { timestamps: true }));
