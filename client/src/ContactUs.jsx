import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from './email';

export const ContactUs = ({ onClose, defaultMessage = '' }) => {
  const form = useRef();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');

  const sendEmail = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorText('');

    emailjs
      .sendForm(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        form.current,
        {
          publicKey: EMAILJS_CONFIG.publicKey,
        }
      )
      .then(
        () => {
          console.log('SUCCESS!');
          setSuccess(true);
          setLoading(false);
          if (form.current) form.current.reset();
        },
        (error) => {
          console.log('FAILED...', error.text);
          setErrorText(error.text || 'Failed to dispatch email.');
          setLoading(false);
        }
      );
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
      color: '#0f172a'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Contact Support / Inquiries</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            &times;
          </button>
        )}
      </div>

      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
        Fill out the form below to send an instant real-time message directly to administration ({EMAILJS_CONFIG.adminEmail}) via EmailJS.
      </p>

      {success && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          ✅ Message sent successfully! We will get back to you shortly.
        </div>
      )}

      {errorText && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          ❌ Error sending message: {errorText}
        </div>
      )}

      <form ref={form} onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
            Name
          </label>
          <input
            type="text"
            name="from_name"
            required
            placeholder="Your Name"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
            Email
          </label>
          <input
            type="email"
            name="from_email"
            required
            placeholder="your-email@gmail.com"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
            Message
          </label>
          <textarea
            name="message"
            required
            rows={4}
            defaultValue={defaultMessage}
            placeholder="Type your message or inquiry..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <input
            type="submit"
            value={loading ? 'Sending via EmailJS...' : 'Send'}
            disabled={loading}
            style={{
              flex: 1,
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 18px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 18px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ContactUs;

