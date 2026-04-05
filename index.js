const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

const resend = new Resend(functions.config().resend.key);

exports.sendReservationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { to, name, status, orderSummary } = data;

  try {
    await resend.emails.send({
      from: 'Spam Musubi <onboarding@resend.dev>',
      to: [to],
      subject: `Your Spam Musubi reservation is ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">🍱 Spam Musubi</h1>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your order <strong>${orderSummary}</strong> has been <strong style="color: ${status === 'confirmed' ? '#10b981' : '#ef4444'}">${status.toUpperCase()}</strong>.</p>
          ${status === 'confirmed' 
            ? '<p>🎉 We’ve saved your reservation. Pick it up on the selected date and time.</p>' 
            : '<p>😢 We’re sorry, but we couldn’t accommodate your order this time. Please try again another day.</p>'}
          <p>Thank you for choosing Spam Musubi!</p>
          <p>If you have any questions, feel free to reply to this email, Or Contact me on this #: 0993820644.</p>
          <hr />
          <p style="font-size: 12px;">If you have questions, reply to this email.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email.');
  }
});