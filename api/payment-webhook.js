import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: verify signature
  // const signature = req.headers['paymongo-signature'];
  // if (signature !== process.env.PAYMONGO_WEBHOOK_SECRET) {
  //   return res.status(401).json({ error: 'Invalid signature' });
  // }

  const event = req.body;
  if (event.data?.attributes?.status === 'paid') {
    const description = event.data.attributes.description;
    const orderIdMatch = description?.match(/Order #(\d+)/);
    if (orderIdMatch) {
      const orderId = orderIdMatch[1];
      const orderRef = db.collection('reservations').doc(orderId);
      await orderRef.update({
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
      });
      // Optionally send email/SMS here
    }
  }

  res.status(200).json({ received: true });
}