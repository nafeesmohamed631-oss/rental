import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import Notification from '../models/Notification.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sudalai1234@gmail.com';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'smartrent_secret_key_123';

// ============================================================
// NODEMAILER GMAIL TRANSPORTER
// ============================================================
const getTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || 'nafeesmohamed631@gmail.com';
  let pass = (process.env.EMAIL_APP_CODE || process.env.SMTP_PASS || '').replace(/["'\s]/g, '');

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass,
      },
    });
  }
  return null;
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
 * Send email to Admin with Direct Action Buttons (Approve / Reject) via Nodemailer
 */
export const sendAdminRentalRequestEmail = async (rental, user, product) => {
  const approveToken = generateActionToken(rental._id.toString(), 'approved');
  const rejectToken = generateActionToken(rental._id.toString(), 'rejected');

  const approveUrl = `${SERVER_URL}/api/rentals/email-action?action=approved&id=${rental._id}&token=${approveToken}`;
  const rejectUrl = `${SERVER_URL}/api/rentals/email-action?action=rejected&id=${rental._id}&token=${rejectToken}`;
  const adminDashboardUrl = `${CLIENT_URL}/admin/requests`;

  const customerName = user?.username || user?.name || 'Customer';
  const customerEmail = user?.email || 'customer@smartrent.com';
  const productTitle = product?.title || product?.name || 'Rental Item';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: #3b82f6; color: #fff; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
        .body { padding: 28px; }
        .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 500; }
        .val { color: #0f172a; font-weight: 600; }
        .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center; }
        .btn-approve { background-color: #10b981; color: #ffffff !important; }
        .btn-reject { background-color: #ef4444; color: #ffffff !important; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">New Rental Request</span>
          <h1 style="margin-top: 10px; color: #ffffff;">Action Required: Rental #${rental.uniqueId || rental._id}</h1>
          <p style="margin: 0; font-size: 14px; color: #94a3b8;">User has completed payment and submitted a rental request.</p>
        </div>
        <div class="body">
          <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">
            Hello <strong>Admin</strong>,<br/>
            A new rental order has been placed on <strong>SmartRent</strong>. Review the details below and select an action to update the order in real time.
          </p>

          <div class="info-grid">
            <div class="info-row"><span class="label">Rental Reference ID:</span><span class="val">#${rental.uniqueId || rental._id}</span></div>
            <div class="info-row"><span class="label">Product Name:</span><span class="val">${productTitle}</span></div>
            <div class="info-row"><span class="label">Category:</span><span class="val">${product?.category || 'General'}</span></div>
            <div class="info-row"><span class="label">Customer:</span><span class="val">${customerName} (${customerEmail})</span></div>
            <div class="info-row"><span class="label">Mobile Number:</span><span class="val">${rental.mobile || 'N/A'}</span></div>
            <div class="info-row"><span class="label">UPI / Payment ID:</span><span class="val">${rental.upiId || 'Paid'}</span></div>
            <div class="info-row"><span class="label">Duration:</span><span class="val">${rental.days} Day(s)</span></div>
            <div class="info-row"><span class="label">Start Date:</span><span class="val">${new Date(rental.startDate).toLocaleDateString()}</span></div>
            <div class="info-row"><span class="label">End Date:</span><span class="val">${new Date(rental.endDate).toLocaleDateString()}</span></div>
            <div class="info-row"><span class="label">Total Paid:</span><span class="val" style="color: #059669; font-size: 16px;">₹${rental.totalAmount}</span></div>
          </div>

          <p style="text-align: center; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px;">
            Click below to Accept or Reject directly from Gmail:
          </p>

          <table width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
            <tr>
              <td align="center" style="padding-right: 8px;">
                <a href="${approveUrl}" class="btn btn-approve" style="display: block; width: 85%; padding: 14px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                  ✓ ACCEPT / APPROVE
                </a>
              </td>
              <td align="center" style="padding-left: 8px;">
                <a href="${rejectUrl}" class="btn btn-reject" style="display: block; width: 85%; padding: 14px; background: #ef4444; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                  ✕ REJECT
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 25px;">
            Alternatively, manage all requests in the <a href="${adminDashboardUrl}" style="color: #3b82f6; font-weight: 600;">Admin Dashboard</a>.
          </p>
        </div>
        <div class="footer">
          SmartRent Rental Management System &copy; ${new Date().getFullYear()} &bull; Sent to ${ADMIN_EMAIL}
        </div>
      </div>
    </body>
    </html>
  `;

  // Log action links to console
  console.log(`\n======================================================`);
  console.log(`📧 [NODEMAILER EMAIL TO ADMIN: ${ADMIN_EMAIL}]`);
  console.log(`📦 New Rental: #${rental.uniqueId} for "${productTitle}" by ${customerEmail}`);
  console.log(`✅ Direct Accept URL: ${approveUrl}`);
  console.log(`❌ Direct Reject URL: ${rejectUrl}`);
  console.log(`======================================================\n`);

  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'nafeesmohamed631@gmail.com';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SmartRent Notifications" <${senderEmail}>`,
        to: ADMIN_EMAIL,
        subject: `[ACTION REQUIRED] New Rental Request #${rental.uniqueId || rental._id} - ${productTitle}`,
        html: htmlContent,
      });
      console.log(`✅ Nodemailer email successfully dispatched to Admin: ${ADMIN_EMAIL}`);
    } catch (err) {
      console.error(`⚠️ Failed to dispatch admin email via Nodemailer:`, err.message);
    }
  }

  const historyEntry = {
    stage: '1. REQUESTED & PAID',
    action: 'Rental request submitted with full payment verification',
    note: `Online payment of ₹${rental.totalAmount} verified. Direct action notification dispatched to admin (${ADMIN_EMAIL}).`,
    actor: 'Customer',
    channel: 'Online Portal',
    timestamp: new Date()
  };

  const metaData = {
    productName: productTitle,
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
    title: `New Rental Request #${rental.uniqueId || rental._id}`,
    message: `${customerName} (${customerEmail}) requested "${productTitle}" for ${rental.days} days (₹${rental.totalAmount}).`,
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
      title: `Rental Request #${rental.uniqueId || rental._id} Placed`,
      message: `Your rental request for "${productTitle}" has been submitted and sent to the administrator for review.`,
      type: 'rental_requested',
      rental: rental._id,
      uniqueId: rental.uniqueId,
      historyLog: [historyEntry],
      meta: metaData
    });
  }
};

/**
 * Send Rental Status Update Email & Notification to User via Nodemailer
 */
export const sendUserRentalStatusEmail = async (rental, user, product, status, extra = {}) => {
  if (!user || !user.email) return;

  const productTitle = product?.title || product?.name || 'Rental Item';
  const userName = user.username || user.name || 'Valued Customer';
  const statusUpper = status.toUpperCase();

  let subject = '';
  let statusHeadline = '';
  let statusColor = '#3b82f6';
  let messageBody = '';

  if (status === 'approved') {
    subject = `🎉 Rental Request Approved: ${productTitle} (#${rental.uniqueId || rental._id})`;
    statusHeadline = 'Rental Request Approved!';
    statusColor = '#10b981';
    messageBody = `Great news! The administrator has approved your rental request for <strong>${productTitle}</strong>. Your rental is now active.`;
  } else if (status === 'rejected') {
    subject = `❌ Rental Request Update: ${productTitle} (#${rental.uniqueId || rental._id})`;
    statusHeadline = 'Rental Request Declined';
    statusColor = '#ef4444';
    messageBody = `Your rental request for <strong>${productTitle}</strong> was not approved at this time. If payment was processed, a refund will be initiated.`;
  } else if (status === 'returned') {
    subject = `📦 Rental Returned: ${productTitle} (#${rental.uniqueId || rental._id})`;
    statusHeadline = 'Product Return Processed';
    statusColor = '#6366f1';
    messageBody = `Your rental of <strong>${productTitle}</strong> has been marked as returned and verified. Thank you for renting with SmartRent!`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: ${statusColor}; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
        .body { padding: 28px; }
        .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .footer { text-align: center; padding: 18px; font-size: 12px; color: #94a3b8; background: #fafafa; border-top: 1px solid #f1f5f9; }
        .btn { display: inline-block; padding: 12px 24px; background: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${statusHeadline}</h1>
        </div>
        <div class="body">
          <p style="font-size: 15px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">${messageBody}</p>

          <div class="info-grid">
            <div class="info-row"><span>Rental ID:</span><strong>#${rental.uniqueId || rental._id}</strong></div>
            <div class="info-row"><span>Product:</span><strong>${productTitle}</strong></div>
            <div class="info-row"><span>Status:</span><strong style="color: ${statusColor}; text-transform: uppercase;">${status}</strong></div>
            <div class="info-row"><span>Rental Period:</span><span>${new Date(rental.startDate).toLocaleDateString()} - ${new Date(rental.endDate).toLocaleDateString()}</span></div>
            <div class="info-row"><span>Total Amount:</span><strong>₹${rental.totalAmount}</strong></div>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${CLIENT_URL}/rentals" class="btn">View My Rentals</a>
          </div>
        </div>
        <div class="footer">
          SmartRent &copy; ${new Date().getFullYear()} &bull; Sent to ${user.email}
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n📧 [NODEMAILER EMAIL TO USER: ${user.email}] Status: ${status} for Rental #${rental.uniqueId || rental._id}`);

  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'nafeesmohamed631@gmail.com';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SmartRent Notifications" <${senderEmail}>`,
        to: user.email,
        subject,
        html: htmlContent,
      });
      console.log(`✅ Nodemailer status update email successfully dispatched to user: ${user.email}`);
    } catch (err) {
      console.error(`⚠️ Failed to dispatch user email via Nodemailer:`, err.message);
    }
  }

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
    productName: productTitle,
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
    title: `Rental Request #${rental.uniqueId || rental._id} ${statusUpper}`,
    message: `Your rental for "${productTitle}" has been ${status}.`,
    type: notifType,
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [historyEntry],
    meta: metaData
  });

  // Create In-App Notification for Admin
  await Notification.create({
    forAdmin: true,
    title: `Rental #${rental.uniqueId || rental._id} Marked as ${statusUpper}`,
    message: `Rental for "${productTitle}" (${userName} - ${user.email}) is now ${status}.`,
    type: notifType,
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [historyEntry],
    meta: metaData
  });
};

/**
 * Send Damage Assessment Notification via Nodemailer
 */
export const sendDamageNotification = async (rental, user, product, damageReport) => {
  const productTitle = product?.title || product?.name || 'Rental Item';
  const userName = user?.username || user?.name || 'Customer';
  const userEmail = user?.email || 'customer@smartrent.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: #dc2626; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
        .body { padding: 28px; }
        .info-grid { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #fecaca; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .footer { text-align: center; padding: 18px; font-size: 12px; color: #94a3b8; background: #fafafa; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⚠️ Damage Report Logged</h1>
        </div>
        <div class="body">
          <p style="font-size: 15px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            An inspection of returned product <strong>${productTitle}</strong> (Rental #${rental.uniqueId || rental._id}) identified damage that incurs a penalty.
          </p>

          <div class="info-grid">
            <div class="info-row"><span>Rental Ref:</span><strong>#${rental.uniqueId || rental._id}</strong></div>
            <div class="info-row"><span>Product:</span><strong>${productTitle}</strong></div>
            <div class="info-row"><span>Damage Penalty:</span><strong style="color: #dc2626; font-size: 16px;">₹${damageReport.damageCost}</strong></div>
            <div class="info-row"><span>Assessment Details:</span><span>${damageReport.damageDetails || 'Item damaged during rental'}</span></div>
          </div>
        </div>
        <div class="footer">
          SmartRent &copy; ${new Date().getFullYear()} &bull; Sent to ${userEmail}
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'nafeesmohamed631@gmail.com';

  if (transporter && userEmail) {
    try {
      await transporter.sendMail({
        from: `"SmartRent Notifications" <${senderEmail}>`,
        to: userEmail,
        subject: `⚠️ Damage Report Logged: Rental #${rental.uniqueId || rental._id} - ${productTitle}`,
        html: htmlContent,
      });
      console.log(`✅ Nodemailer damage notification sent to user: ${userEmail}`);
    } catch (err) {
      console.error(`⚠️ Failed to dispatch damage email via Nodemailer:`, err.message);
    }
  }

  const damageHistory = {
    stage: 'INSPECTION & DAMAGE',
    action: `Damage assessment logged: ₹${damageReport.damageCost} penalty`,
    note: damageReport.damageDetails || 'Item damaged during rental',
    actor: 'Admin',
    channel: 'Admin Portal',
    timestamp: new Date()
  };

  const metaData = {
    productName: productTitle,
    productCategory: product?.category || 'General',
    customerName: userName,
    customerEmail: userEmail,
    customerMobile: rental.mobile,
    amount: rental.totalAmount,
    days: rental.days,
    status: rental.status,
    channel: 'Admin Portal'
  };

  // In-app notif for user in MongoDB
  if (user) {
    await Notification.create({
      user: user._id || user,
      forAdmin: false,
      title: `⚠️ Damage Report Logged for #${rental.uniqueId || rental._id}`,
      message: `Damage assessment for "${productTitle}": ₹${damageReport.damageCost} penalty recorded. Details: ${damageReport.damageDetails}`,
      type: 'damage_reported',
      rental: rental._id,
      uniqueId: rental.uniqueId,
      historyLog: [damageHistory],
      meta: metaData
    });
  }

  // In-app notif for admin in MongoDB
  await Notification.create({
    forAdmin: true,
    title: `Damage Report Saved for #${rental.uniqueId || rental._id}`,
    message: `Damage of ₹${damageReport.damageCost} logged on "${productTitle}" (User: ${userEmail}).`,
    type: 'damage_reported',
    rental: rental._id,
    uniqueId: rental.uniqueId,
    historyLog: [damageHistory],
    meta: metaData
  });
};
