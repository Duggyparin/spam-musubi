import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  useEffect(() => {
    const checkOrder = async () => {
      if (orderId) {
        const orderRef = doc(db, 'reservations', orderId);
        const snap = await getDoc(orderRef);
        if (snap.exists() && snap.data().status === 'confirmed') {
          // Optional: update UI or show message
        }
      }
    };
    checkOrder();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-black text-amber-400 mb-2">Payment Successful!</h1>
        <p className="text-white/60 mb-6">Your order is now confirmed.</p>
        <button onClick={() => navigate('/dashboard')} className="bg-amber-400 text-black px-6 py-2 rounded-xl">Go to Dashboard</button>
      </div>
    </div>
  );
}