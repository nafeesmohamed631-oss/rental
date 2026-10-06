import mongoose from 'mongoose';

const historyEventSchema = new mongoose.Schema({
  stage: { type: String, required: true },
  action: { type: String, required: true },
  note: { type: String, default: '' },
  actor: { type: String, default: 'System' },
  channel: { type: String, default: 'System' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

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
  historyLog: [historyEventSchema],
  meta: {
    productName: String,
    productCategory: String,
    customerName: String,
    customerEmail: String,
    customerMobile: String,
    amount: Number,
    days: Number,
    startDate: Date,
    endDate: Date,
    status: String,
    channel: String
  }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
