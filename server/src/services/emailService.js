import jwt from 'jsonwebtoken';
import Notification from '../models/Notification.js';

// ============================================================
// EMAILJS CREDENTIALS & SERVICE CONFIG
// ============================================================
const EMAILJS_SERVICE_ID = 'service_zel8uao';
const EMAILJS_TEMPLATE_ID = 'template_o6v7una';
const EMAILJS_PUBLIC_KEY = 'yatzmaslIW7Et77qo';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sudalai1234@gmail.com';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'smartrent_secret_key_123';

/**
 * Dispatch real-time email using EmailJS REST API
 */
export const dispatchEmailJS = async ({ from_name, from_email, message }) => {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': CLIENT_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          from_name: from_name || 'SmartRent System',
          from_email: from_email || 'no-reply@smartrent.com',
          message: message || ''
        }
      })
    });

    const resText = await response.text();
    if (response.ok) {
      console.log(`✅ [EmailJS Dispatched Successfully] Status: ${response.status} - Sent for ${from_name}`);
      return { success: true, resText };
    } else {
      console.warn(`⚠️ [EmailJS Warning] Status: ${response.status} - ${resText}`);
      return { success: false, resText };
    }
  } catch (error) {
    console.error(`❌ [EmailJS Dispatch Error]`, error.message);
    return { success: false, error: error.message };
  }
};

// Generate action token for email links
export const generateActionToken = (rentalId, action) => {
  return jwt.sign({ rentalId, action }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify action token
export const verifyActionToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Send real-time email to Admin with Direct Action Buttons (Approve / Reject) via EmailJS
 */
export const sendAdminRentalRequestEmail = async (rental, user, product) => {
  const approveToken = generateActionToken(rental._id.toString(), 'approved');
  const rejectToken = generateActionToken(rental._id.toString(), 'rejected');

  const approveUrl = `${SERVER_URL}/api/rentals/email-action?action=approved&id=${rental._id}&token=${approveToken}`;
  const rejectUrl = `${SERVER_URL}/api/rentals/email-action?action=rejected&id=${rental._id}&token=${rejectToken}`;
  const adminDashboardUrl = `${CLIENT_URL}/admin/requests`;

  const customerName = user?.username || 'Customer';
  const customerEmail = user?.email || 'customer@smartrent.com';

  const messageText = [
    `🚨 NEW RENTAL REQUEST - ACTION REQUIRED`,
    `==========================================`,
    `Rental Ref ID: #${rental.uniqueId || rental._id}`,
    `Product: ${product?.title || 'Product'} (${product?.category || 'General'})`,
    `Customer: ${customerName} (${customerEmail})`,
    `Mobile: ${rental.mobile || 'N/A'}`,
    `Payment / UPI Ref: ${rental.upiId || 'Paid'}`,
    `Duration: ${rental.days} Days`,
    `Start Date: ${new Date(rental.startDate).toLocaleDateString()}`,
    `End Date: ${new Date(rental.endDate).toLocaleDateString()}`,
    `Total Paid: ₹${rental.totalAmount}`,
    ``,
    `DIRECT ACTION LINKS:`,
    `👉 ACCEPT / APPROVE: ${approveUrl}`,
    `👉 REJECT: ${rejectUrl}`,
    ``,
    `Admin Dashboard: ${adminDashboardUrl}`,
    `==========================================`,
    `SmartRent Real-Time Notification System (Sent to: ${ADMIN_EMAIL})`
  ].join('\n');

  // Log action links to console
  console.log(`\n======================================================`);
  console.log(`📧 [EMAILJS TO ADMIN: ${ADMIN_EMAIL}]`);
  console.log(`📦 New Rental: ${rental.uniqueId} for "${product?.title}" by ${customerEmail}`);
  console.log(`✅ Direct Accept URL: ${approveUrl}`);
  console.log(`❌ Direct Reject URL: ${rejectUrl}`);
  console.log(`======================================================\n`);

  // Dispatch real-time email via EmailJS
  await dispatchEmailJS({
    from_name: `SmartRent - ${customerName}`,
    from_email: customerEmail,
    message: messageText
  });

  const historyEntry = {
    stage: '1. REQUESTED & PAID',
    action: 'Rental request submitted with full payment verification',
    note: `Online payment of ₹${rental.totalAmount} verified. Direct action dispatch sent to admin (${ADMIN_EMAIL}).`,
    actor: 'Customer',
    channel: 'Online Portal',
    timestamp: new Date()
  };

  const metaData = {
    productName: product?.title || 'Product',
    productCategory: product?.category || 'General',
    customerName: customerName,
    customerEmail: customerEmail,
    customerMobile: rental.mobile,
    amount: rental.totalAmount,
    days: rental.days,
    startDate: rental.startDate,
    endDate: rental.endDate,
    status: 'pending',
    channel: 'Online Portal'
  };

  // Create In-App Notification for Admin in MongoDB
  await Notification.create({
    forAdmin: true,
    title: `New Rental Request #${rental.uniqueId}`,
    message: `${customerName} (${customerEmail}) requested "${product?.title}" for ${rental.days} days (₹${rental.totalAmount}).`,
    type: 'rental_requested',
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [historyEntry],
    meta: metaData
  });

  // Create In-App Notification for User in MongoDB
  if (user) {
    await Notification.create({
      user: user._id || user,
      forAdmin: false,
      title: `Rental Request #${rental.uniqueId} Placed`,
      message: `Your rental request for "${product?.title || 'Product'}" has been submitted and sent to the administrator for review.`,
      type: 'rental_requested',
      rental: rental._id,
      uniqueId: rental.uniqueId,
      historyLog: [historyEntry],
      meta: metaData
    });
  }
};

/**
 * Send Rental Status Update Email & Notification via EmailJS
 */
export const sendUserRentalStatusEmail = async (rental, user, product, status, extra = {}) => {
  if (!user || !user.email) return;

  const statusUpper = status.toUpperCase();
  const userName = user.username || 'Customer';

  const userMessage = [
    `📢 RENTAL STATUS UPDATE: #${rental.uniqueId || rental._id} IS NOW ${statusUpper}`,
    `==========================================`,
    `Hello ${userName},`,
    `Your rental request for "${product?.title || 'Product'}" has been updated to: ${statusUpper}.`,
    ``,
    `Rental Details:`,
    `- Rental Ref: #${rental.uniqueId || rental._id}`,
    `- Product: ${product?.title || 'Product'}`,
    `- Status: ${statusUpper}`,
    `- Rental Period: ${new Date(rental.startDate).toLocaleDateString()} to ${new Date(rental.endDate).toLocaleDateString()}`,
    `- Total Amount: ₹${rental.totalAmount}`,
    `- Details / Notes: ${extra.note || (status === 'approved' ? 'Rental confirmed and active.' : status === 'returned' ? 'Item returned and verified.' : 'Request declined.')}`,
    ``,
    `View your active rentals anytime: ${CLIENT_URL}/rentals`,
    `==========================================`,
    `SmartRent Real-Time Rental Services`
  ].join('\n');

  console.log(`\n📧 [EMAILJS STATUS UPDATE: ${user.email}] Status: ${status} for Rental ${rental.uniqueId}`);

  // Dispatch real-time email via EmailJS
  await dispatchEmailJS({
    from_name: `SmartRent Admin`,
    from_email: ADMIN_EMAIL,
    message: userMessage
  });

  // Create In-App Notification for User
  let notifType = 'info';
  let stageName = '2. APPROVED & ACTIVE';
  if (status === 'approved') {
    notifType = 'rental_approved';
    stageName = '2. APPROVED & ACTIVE';
  } else if (status === 'rejected') {
    notifType = 'rental_rejected';
    stageName = 'DECLINED';
  } else if (status === 'returned') {
    notifType = 'rental_returned';
    stageName = '3. RETURNED & BILLED';
  }

  const historyEntry = {
    stage: stageName,
    action: `Rental status changed to ${statusUpper}`,
    note: extra.note || (status === 'approved' ? 'Rental confirmed and active.' : status === 'returned' ? 'Item return inspected and verified.' : 'Request declined.'),
    actor: 'Admin',
    channel: extra.channel || 'Admin Portal / Gmail Action',
    timestamp: new Date()
  };

  const metaData = {
    productName: product?.title || product?.name || 'Product',
    productCategory: product?.category || 'General',
    customerName: userName,
    customerEmail: user.email,
    customerMobile: rental.mobile,
    amount: rental.totalAmount,
    days: rental.days,
    startDate: rental.startDate,
    endDate: rental.endDate,
    status: status,
    channel: extra.channel || 'Admin Portal'
  };

  await Notification.create({
    user: user._id || user,
    forAdmin: false,
    title: `Rental Request #${rental.uniqueId} ${statusUpper}`,
    message: `Your rental for "${product?.title || product?.name || 'Product'}" has been ${status}.`,
    type: notifType,
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [historyEntry],
    meta: metaData
  });

  // Create In-App Notification for Admin
  await Notification.create({
    forAdmin: true,
    title: `Rental #${rental.uniqueId} Marked as ${statusUpper}`,
    message: `Rental for "${product?.title || product?.name || 'Product'}" (${userName} - ${user.email}) is now ${status}.`,
    type: notifType,
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [historyEntry],
    meta: metaData
  });
};

/**
 * Send Damage Assessment Notification via EmailJS
 */
export const sendDamageNotification = async (rental, user, product, damageReport) => {
  const userName = user?.username || 'Customer';
  const userEmail = user?.email || 'customer@smartrent.com';

  const damageText = [
    `⚠️ DAMAGE REPORT NOTIFICATION - RENTAL #${rental.uniqueId || rental._id}`,
    `==========================================`,
    `Customer: ${userName} (${userEmail})`,
    `Product: ${product?.title || product?.name || 'Product'}`,
    `Damage Penalty Assessed: ₹${damageReport.damageCost}`,
    `Inspection Details: ${damageReport.damageDetails || 'Item damaged during rental period'}`,
    ``,
    `Admin Portal: ${CLIENT_URL}/admin/requests`,
    `==========================================`,
    `SmartRent Inspection Audit`
  ].join('\n');

  // Dispatch real-time email via EmailJS
  await dispatchEmailJS({
    from_name: 'SmartRent Damage Inspection',
    from_email: ADMIN_EMAIL,
    message: damageText
  });

  const damageHistory = {
    stage: 'INSPECTION & DAMAGE',
    action: `Damage assessment logged: ₹${damageReport.damageCost} penalty`,
    note: damageReport.damageDetails || 'Item damaged during rental',
    actor: 'Admin',
    channel: 'Admin Portal',
    timestamp: new Date()
  };

  const metaData = {
    productName: product?.title || product?.name || 'Product',
    productCategory: product?.category || 'General',
    customerName: userName,
    customerEmail: userEmail,
    customerMobile: rental.mobile,
    amount: rental.totalAmount,
    days: rental.days,
    status: rental.status,
    channel: 'Admin Portal'
  };

  // In-app notif for user
  if (user) {
    await Notification.create({
      user: user._id || user,
      forAdmin: false,
      title: `⚠️ Damage Report Logged for #${rental.uniqueId}`,
      message: `Damage assessment for "${product?.title || product?.name || 'Product'}": ₹${damageReport.damageCost} penalty recorded. Details: ${damageReport.damageDetails}`,
      type: 'damage_reported',
      rental: rental._id,
      uniqueId: rental.uniqueId,
      historyLog: [damageHistory],
      meta: metaData
    });
  }

  // In-app notif for admin
  await Notification.create({
    forAdmin: true,
    title: `Damage Report Saved for #${rental.uniqueId}`,
    message: `Damage of ₹${damageReport.damageCost} logged on "${product?.title || product?.name || 'Product'}" (User: ${userEmail}).`,
    type: 'damage_reported',
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [damageHistory],
    meta: metaData
  });
};
