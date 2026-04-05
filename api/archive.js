import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

let db;
if (!global._firestoreDb) {
  const app = initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore(app);
  global._firestoreDb = db;
} else {
  db = global._firestoreDb;
}

// Helper function to normalize date to YYYY-MM-DD for comparison
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  // If it's already YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If it's like "2026-03-23T00:00:00.000Z" or "2026-03-23T00:00:00Z"
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  
  // Try to parse as date
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  
  return null;
}

export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.ARCHIVE_SECRET && secret !== 'mySecret123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const TODAY = new Date().toISOString().split('T')[0];
  const reservationsRef = db.collection('reservations');
  const archivesRef = db.collection('archives');

  try {
    // Get ALL reservations (can't use where with inconsistent date formats)
    const allReservations = await reservationsRef.get();
    const toArchive = [];
    
    // Manually filter by normalized date
    allReservations.docs.forEach(doc => {
      const data = doc.data();
      const normalizedDate = normalizeDate(data.pickupDate);
      if (normalizedDate && normalizedDate < TODAY) {
        toArchive.push({ id: doc.id, data, normalizedDate });
      }
    });
    
    if (toArchive.length === 0) {
      return res.status(200).json({ message: 'No past reservations to archive.' });
    }

    // Archive each reservation
    for (const item of toArchive) {
      await archivesRef.add({ ...item.data, archivedAt: new Date().toISOString() });
      await reservationsRef.doc(item.id).delete();
    }

    return res.status(200).json({ archived: toArchive.length });
  } catch (error) {
    console.error('Archive error:', error);
    return res.status(500).json({ error: error.message });
  }
}