import emailjs from '@emailjs/browser';

const emailConfig = {
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL
};

export const isEmailConfigured = () => Object.values(emailConfig).every(Boolean);

export async function sendRentalEmail({ recipientEmail, recipientName, subject, status, rental }) {
  if (!isEmailConfigured() || !recipientEmail) {
    console.warn('EmailJS is not configured or the recipient email is missing.');
    return false;
  }

  try {
    await emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
      to_email: recipientEmail,
      to_name: recipientName || 'SmartRent customer',
      subject,
      status,
      rental_id: rental.uniqueId || rental._id,
      product_name: rental.product?.name || 'Rental item',
      rental_days: rental.days,
      total_amount: `INR ${rental.totalAmount}`,
      start_date: new Date(rental.startDate).toLocaleDateString(),
      end_date: new Date(rental.endDate).toLocaleDateString(),
      mobile: rental.mobile || 'N/A',
      message: `Your SmartRent rental request for ${rental.product?.name || 'the item'} is ${status}.`
    }, emailConfig.publicKey);
    return true;
  } catch (error) {
    console.error('EmailJS notification failed:', error);
    return false;
  }
}

export const getAdminEmail = () => emailConfig.adminEmail;
