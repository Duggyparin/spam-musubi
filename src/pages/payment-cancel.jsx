import { useNavigate } from 'react-router-dom';

export default function PaymentCancel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-3xl font-black text-red-400 mb-2">Payment Cancelled</h1>
        <p className="text-white/60 mb-6">You can try again later.</p>
        <button onClick={() => navigate('/dashboard')} className="bg-amber-400 text-black px-6 py-2 rounded-xl">Back to Dashboard</button>
      </div>
    </div>
  );
}