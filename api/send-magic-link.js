// api/send-magic-link.js
import admin from 'firebase-admin';
import { Resend } from 'resend';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const actionCodeSettings = {
      url: 'https://spam-musubi.vercel.app/dashboard',
      handleCodeInApp: true,
    };
    const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

    // Send plain text email only – no HTML, always clickable
    await resend.emails.send({
      from: 'Spam Musubi <onboarding@resend.dev>',
      to: email,
      subject: 'Your magic link to log in 🍱',
      text: `Log in to Spam Musubi by clicking or copying this link into your browser:\n\n${link}\n\nThis link expires after one use. If you didn't request this, ignore this email.`,
    });

    res.status(200).json({ success: true, message: 'Magic link sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}