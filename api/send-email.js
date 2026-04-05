import { Resend } from 'resend';
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const { to, name, status, orderSummary } = req.body;
 
  if (!to || !name || !status || !orderSummary) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
 
  const resend = new Resend(process.env.RESEND_API_KEY);
 
  try {
    await resend.emails.send({
      from: 'Spam Musubi <onboarding@resend.dev>',
      to: ['cleahsuarez@gmail.com'],
      subject: `Spam Musubi reservation ${status} for ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">Spam Musubi</h1>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your order <strong>${orderSummary}</strong> has been
            <strong style="color: ${status === 'confirmed' ? '#10b981' : '#ef4444'}">
              ${status.toUpperCase()}
            </strong>.
          </p>
          ${status === 'confirmed'
            ? '<p>Your reservation is saved. Pick it up on the selected date and time.</p>'
            : '<p>We could not accommodate your order this time. Please try again another day.</p>'
          }
          <p>Thank you for choosing Spam Musubi!</p>
          <hr />
          <p style="font-size: 12px; color: #999;">If you have questions, reply to this email.</p>
          <p style="font-size: 12px; color: #999;">This email was intended for: ${to}</p>
        </div>
      `,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message });
  }
}