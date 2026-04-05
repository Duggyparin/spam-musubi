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

// Helper function to get all dates between start and end
function getDatesBetween(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export default async function handler(req, res) {
  const secret = req.query.secret;
  
  if (secret !== process.env.ARCHIVE_SECRET && secret !== 'mySecret123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all reservations (active and archived)
    const reservationsSnapshot = await db.collection('reservations').get();
    const archivesSnapshot = await db.collection('archives').get();
    
    const allReservations = [
      ...reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...archivesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ];
    
    // Filter to only COMPLETED orders
    const completedOrders = allReservations.filter(r => r.status === 'completed');
    
    // Calculate totals from completed orders only
    const totalOrders = completedOrders.length;
    const totalEarnings = completedOrders.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const activeCount = reservationsSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
    const archivedCount = archivesSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
    
    // Create a map of order counts by date from completed orders
    const orderCountByDate = new Map();
    completedOrders.forEach(order => {
      const orderDate = order.pickupDate || order.createdAt?.split('T')[0];
      if (orderDate) {
        orderCountByDate.set(orderDate, (orderCountByDate.get(orderDate) || 0) + 1);
      }
    });
    
    // Get today's date
    const today = new Date();
    
    // LAST 7 DAYS - Show consecutive dates from 7 days ago to yesterday
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push({
        date: dateStr,
        orders: orderCountByDate.get(dateStr) || 0
      });
    }
    // Sort ascending (oldest first)
    last7Days.sort((a, b) => a.date.localeCompare(b.date));
    
    // LAST 30 DAYS - Show consecutive dates from 30 days ago to yesterday
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days.push({
        date: dateStr,
        orders: orderCountByDate.get(dateStr) || 0
      });
    }
    // Sort ascending (oldest first)
    last30Days.sort((a, b) => a.date.localeCompare(b.date));
    
    // Popular products from completed orders only
    const productCount = new Map();
    completedOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const name = item.productName;
          productCount.set(name, (productCount.get(name) || 0) + item.quantity);
        });
      } else if (order.productName) {
        productCount.set(order.productName, (productCount.get(order.productName) || 0) + (order.quantity || 1));
      }
    });
    
    const popularProducts = Array.from(productCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    res.status(200).json({
      totalOrders,
      totalEarnings,
      activeCount,
      archivedCount,
      last7Days,
      last30Days,
      popularProducts,
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
}