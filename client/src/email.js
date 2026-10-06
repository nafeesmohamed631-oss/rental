import emailjs from '@emailjs/browser';

// ============================================================
// EMAILJS REAL-TIME CREDENTIALS & SERVICE CONFIG
// ============================================================
export const EMAILJS_CONFIG = {
  serviceId: 'service_zel8uao',
  templateId: 'template_o6v7una',
  publicKey: 'yatzmaslIW7Et77qo',
  adminEmail: 'sudalai1234@gmail.com'
};

export const getAdminEmail = () => EMAILJS_CONFIG.adminEmail;

/**
 * Dispatch custom real-time email notification via EmailJS
 */
export async function sendRealtimeEmail({ from_name, from_email, message, ...extraParams }) {
  try {
    const res = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        from_name: from_name || 'SmartRent Customer',
        from_email: from_email || 'customer@smartrent.com',
        message: message || '',
        ...extraParams
      },
      {
        publicKey: EMAILJS_CONFIG.publicKey
      }
    );
    console.log('✅ [EmailJS Success] Dispatched successfully:', res.status, res.text);
    return { success: true, res };
  } catch (error) {
    console.error('❌ [EmailJS Error] Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Send rental-specific real-time email
 */
export async function sendRentalEmail({ recipientEmail, recipientName, subject, status, rental }) {
  const msg = `Rental Update #${rental?.uniqueId || rental?._id || 'REQ'}: Status is ${status.toUpperCase()}. Product: ${rental?.product?.name || rental?.product?.title || 'Rental Item'}. Total: INR ${rental?.totalAmount}.`;
  return sendRealtimeEmail({
    from_name: recipientName || 'SmartRent Notification',
    from_email: recipientEmail || 'customer@smartrent.com',
    message: msg,
    subject,
    status,
    rental_id: rental?.uniqueId || rental?._id,
    total_amount: rental?.totalAmount
  });
}
