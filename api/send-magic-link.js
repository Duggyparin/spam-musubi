
// api/send-magic-link.js
import admin from 'firebase-admin';
import { Resend } from 'resend';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  // Get values from environment variables (we'll set them next)
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate the magic link using Firebase Admin SDK
    const actionCodeSettings = {
      url: 'https://spam-musubi.vercel.app/dashboard', // change to your domain
      handleCodeInApp: true,
    };
    const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

    // Send the email using Resend
    await resend.emails.send({
      from: 'Spam Musubi <onboarding@resend.dev>', // Resend's test sender (you can change later)
      to: email,
      subject: 'Your magic link to log in 🍱',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">🍱 Spam Musubi</h1>
          <p>Click the button below to log in:</p>
          <a href="${link}" style="display: inline-block; background-color: #f59e0b; color: black; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Log in instantly</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">If the button doesn't work, copy this link into your browser:</p>
          <p style="font-size: 12px; word-break: break-all;">${link}</p>
        </div>
      `,
    });

    res.status(200).json({ success: true, message: 'Magic link sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}