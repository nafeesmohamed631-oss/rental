import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  forAdmin: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'info',
      'success',
      'warning',
      'error',
      'rental_requested',
      'rental_approved',
      'rental_rejected',
      'rental_returned',
      'damage_reported'
    ],
    default: 'info'
  },
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
  uniqueId: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);

