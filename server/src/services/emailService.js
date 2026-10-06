import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import Notification from '../models/Notification.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sudalai1234@gmail.com';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'smartrent_secret_key_123';

// Initialize nodemailer transporter
const getTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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
 * Send email to Admin with Direct Action Buttons (Approve / Reject)
 */
export const sendAdminRentalRequestEmail = async (rental, user, product) => {
  const approveToken = generateActionToken(rental._id.toString(), 'approved');
  const rejectToken = generateActionToken(rental._id.toString(), 'rejected');

  const approveUrl = `${SERVER_URL}/api/rentals/email-action?action=approved&id=${rental._id}&token=${approveToken}`;
  const rejectUrl = `${SERVER_URL}/api/rentals/email-action?action=rejected&id=${rental._id}&token=${rejectToken}`;
  const adminDashboardUrl = `${CLIENT_URL}/admin/requests`;

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
        .actions { display: flex; gap: 14px; margin: 30px 0 10px 0; justify-content: center; }
        .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center; }
        .btn-approve { background-color: #10b981; color: #ffffff !important; }
        .btn-reject { background-color: #ef4444; color: #ffffff !important; }
        .btn:hover { opacity: 0.92; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">New Rental Request</span>
          <h1 style="margin-top: 10px;">Action Required: Rental #${rental.uniqueId || rental._id}</h1>
          <p style="margin: 0; font-size: 14px; color: #94a3b8;">User has completed payment and submitted a rental request.</p>
        </div>
        <div class="body">
          <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">
            Hello <strong>Admin</strong>,<br/>
            A new rental order has been placed on <strong>SmartRent</strong>. Review the details below and select an action to update the order in real time.
          </p>

          <div class="info-grid">
            <div class="info-row"><span class="label">Rental Reference ID:</span><span class="val">${rental.uniqueId || rental._id}</span></div>
            <div class="info-row"><span class="label">Product Name:</span><span class="val">${product?.title || 'Product'}</span></div>
            <div class="info-row"><span class="label">Category:</span><span class="val">${product?.category || 'General'}</span></div>
            <div class="info-row"><span class="label">Customer:</span><span class="val">${user?.username || 'Customer'} (${user?.email || ''})</span></div>
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
          SmartRent Multi-Platform Rental System &copy; ${new Date().getFullYear()} &bull; Sent automatically to ${ADMIN_EMAIL}
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log action links to console so development is smooth
  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL TO ADMIN: ${ADMIN_EMAIL}]`);
  console.log(`📦 New Rental: ${rental.uniqueId} for "${product?.title}" by ${user?.email}`);
  console.log(`✅ Direct Accept URL: ${approveUrl}`);
  console.log(`❌ Direct Reject URL: ${rejectUrl}`);
  console.log(`======================================================\n`);

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SmartRent Notifications" <${process.env.SMTP_USER || 'no-reply@smartrent.com'}>`,
        to: ADMIN_EMAIL,
        subject: `[ACTION REQUIRED] New Rental Request #${rental.uniqueId} - ${product?.title}`,
        html: htmlContent,
      });
      console.log(`✅ Email successfully dispatched to ${ADMIN_EMAIL}`);
    } catch (err) {
      console.error(`⚠️ Failed to send email via SMTP:`, err.message);
    }
  }

  // Create In-App Notification for Admin
  await Notification.create({
    forAdmin: true,
    title: `New Rental Request #${rental.uniqueId}`,
    message: `${user?.username || 'User'} (${user?.email}) requested "${product?.title}" for ${rental.days} days (₹${rental.totalAmount}).`,
    type: 'rental_requested',
    rental: rental._id,
    uniqueId: rental.uniqueId,
  });

  // Create In-App Notification for User
  if (user) {
    await Notification.create({
      user: user._id || user,
      forAdmin: false,
      title: `Rental Request #${rental.uniqueId} Placed`,
      message: `Your rental request for "${product?.title || 'Product'}" has been submitted and sent to the administrator for review.`,
      type: 'rental_requested',
      rental: rental._id,
      uniqueId: rental.uniqueId,
    });
  }
};

/**
 * Send Rental Status Update Email & Notification to User
 */
export const sendUserRentalStatusEmail = async (rental, user, product, status, extra = {}) => {
  if (!user || !user.email) return;

  let subject = '';
  let statusHeadline = '';
  let statusColor = '#3b82f6';
  let messageBody = '';

  if (status === 'approved') {
    subject = `🎉 Rental Request Approved: ${product?.title} (#${rental.uniqueId})`;
    statusHeadline = 'Rental Request Approved!';
    statusColor = '#10b981';
    messageBody = `Great news! The administrator has approved your rental request for <strong>${product?.title}</strong>. Your rental is now active.`;
  } else if (status === 'rejected') {
    subject = `❌ Rental Request Update: ${product?.title} (#${rental.uniqueId})`;
    statusHeadline = 'Rental Request Declined';
    statusColor = '#ef4444';
    messageBody = `Your rental request for <strong>${product?.title}</strong> was not approved at this time. If payment was processed, refund will be initiated.`;
  } else if (status === 'returned') {
    subject = `📦 Rental Returned: ${product?.title} (#${rental.uniqueId})`;
    statusHeadline = 'Product Return Processed';
    statusColor = '#6366f1';
    messageBody = `Your rental of <strong>${product?.title}</strong> has been marked as returned and verified. Thank you for renting with SmartRent!`;
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
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .body { padding: 28px; }
        .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .footer { text-align: center; padding: 18px; font-size: 12px; color: #94a3b8; background: #fafafa; border-top: 1px solid #f1f5f9; }
        .btn { display: inline-block; padding: 12px 24px; background: #0f172a; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${statusHeadline}</h1>
        </div>
        <div class="body">
          <p style="font-size: 15px; margin-top: 0;">Hi <strong>${user.username || 'Valued Customer'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">${messageBody}</p>

          <div class="info-grid">
            <div class="info-row"><span>Rental ID:</span><strong>${rental.uniqueId || rental._id}</strong></div>
            <div class="info-row"><span>Product:</span><strong>${product?.title}</strong></div>
            <div class="info-row"><span>Status:</span><strong style="color: ${statusColor}; text-transform: uppercase;">${status}</strong></div>
            <div class="info-row"><span>Rental Period:</span><span>${new Date(rental.startDate).toLocaleDateString()} - ${new Date(rental.endDate).toLocaleDateString()}</span></div>
            <div class="info-row"><span>Total Amount:</span><strong>₹${rental.totalAmount}</strong></div>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${CLIENT_URL}/dashboard" class="btn">View My Rentals</a>
          </div>
        </div>
        <div class="footer">
          SmartRent &copy; ${new Date().getFullYear()} &bull; Sent to ${user.email}
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n📧 [EMAIL TO USER: ${user.email}] Status: ${status} for Rental ${rental.uniqueId}`);

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SmartRent Notifications" <${process.env.SMTP_USER || 'no-reply@smartrent.com'}>`,
        to: user.email,
        subject,
        html: htmlContent,
      });
      console.log(`✅ Email successfully dispatched to user ${user.email}`);
    } catch (err) {
      console.error(`⚠️ Failed to send user email via SMTP:`, err.message);
    }
  }

  // Create In-App Notification for User
  let notifType = 'info';
  if (status === 'approved') notifType = 'rental_approved';
  else if (status === 'rejected') notifType = 'rental_rejected';
  else if (status === 'returned') notifType = 'rental_returned';

  await Notification.create({
    user: user._id || user,
    forAdmin: false,
    title: `Rental Request #${rental.uniqueId} ${status.toUpperCase()}`,
    message: `Your rental for "${product?.title || 'Product'}" has been ${status}.`,
    type: notifType,
    rental: rental._id,
    uniqueId: rental.uniqueId,
  });

  // Create In-App Notification for Admin
  await Notification.create({
    forAdmin: true,
    title: `Rental #${rental.uniqueId} Marked as ${status.toUpperCase()}`,
    message: `Rental for "${product?.title || 'Product'}" (${user?.username || user?.email || 'User'}) is now ${status}.`,
    type: notifType,
    rental: rental._id,
    uniqueId: rental.uniqueId,
  });
};

/**
 * Send Damage Assessment Notification
 */
export const sendDamageNotification = async (rental, user, product, damageReport) => {
  // In-app notif for user
  if (user) {
    await Notification.create({
      user: user._id || user,
      forAdmin: false,
      title: `⚠️ Damage Report Logged for #${rental.uniqueId}`,
      message: `Damage assessment for "${product?.title}": ₹${damageReport.damageCost} penalty recorded. Details: ${damageReport.damageDetails}`,
      type: 'damage_reported',
      rental: rental._id,
      uniqueId: rental.uniqueId,
    });
  }

  // In-app notif for admin
  await Notification.create({
    forAdmin: true,
    title: `Damage Report Saved for #${rental.uniqueId}`,
    message: `Damage of ₹${damageReport.damageCost} logged on "${product?.title}" (User: ${user?.email || 'N/A'}).`,
    type: 'damage_reported',
    rental: rental._id,
    uniqueId: rental.uniqueId,
  });
};

