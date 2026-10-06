import express from 'express';
import Notification from '../models/Notification.js';
import Rental from '../models/Rental.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for logged in user or admin
router.get('/mine', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      // Admin sees admin notifications and any addressed directly
      query = { $or: [{ forAdmin: true }, { user: req.user.id }] };
    } else {
      query = { user: req.user.id, forAdmin: false };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: 'rental',
        populate: [
          { path: 'product' },
          { path: 'user', select: 'username email' }
        ]
      });

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

// Get detailed lifecycle history stored in MongoDB for a specific rental / uniqueId
router.get('/history/:uniqueId', auth, async (req, res) => {
  try {
    const { uniqueId } = req.params;

    // Find all notifications related to this uniqueId
    const historyEntries = await Notification.find({ uniqueId })
      .sort({ createdAt: 1 })
      .populate({
        path: 'rental',
        populate: [
          { path: 'product' },
          { path: 'user', select: 'username email' }
        ]
      });

    // Also fetch current rental details from MongoDB
    const rental = await Rental.findOne({ uniqueId })
      .populate('product')
      .populate('user', 'username email');

    res.json({
      uniqueId,
      rental,
      timeline: historyEntries
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notification history', error: err.message });
  }
});

// Mark single notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification', error: err.message });
  }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      query = { $or: [{ forAdmin: true }, { user: req.user.id }] };
    } else {
      query = { user: req.user.id, forAdmin: false };
    }

    await Notification.updateMany(query, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications read', error: err.message });
  }
});

// Clear all notifications
router.delete('/clear-all', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      query = { $or: [{ forAdmin: true }, { user: req.user.id }] };
    } else {
      query = { user: req.user.id, forAdmin: false };
    }

    await Notification.deleteMany(query);
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear notifications', error: err.message });
  }
});

// Clear a single notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notification', error: err.message });
  }
});

export default router;
