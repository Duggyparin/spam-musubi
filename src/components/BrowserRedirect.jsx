import { useState } from 'react';

const APP_URL = "https://spam-musubi.vercel.app/";

export default function BrowserRedirect() {
  const [copied, setCopied] = useState(false);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  const ua = navigator.userAgent.toLowerCase();
  const isEmbedded =
    ua.includes('fbav') || ua.includes('fban') ||
    ua.includes('instagram') || ua.includes('messenger') ||
    ua.includes('gmail') || ua.includes('twitter') ||
    ua.includes('wv') || ua.includes('webview');

  const copy = () => {
    navigator.clipboard.writeText(APP_URL);
    setCopied(true);
  };

  if (!isEmbedded) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] border-2 border-amber-400/50 rounded-2xl max-w-sm w-full p-6 shadow-2xl">

        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🍱</div>
          <h2 className="text-xl font-black text-amber-400 mb-1">One quick step!</h2>
          <p className="text-white/60 text-sm">
            Google Sign-In doesn't work inside Messenger/Instagram.
            Follow these steps to reserve your musubi!
          </p>
        </div>

        {/* Step 1: Copy link */}
        <div className={`rounded-xl p-4 mb-3 border transition-all ${
          copied
            ? 'bg-green-400/10 border-green-400/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
              copied ? 'bg-green-400 text-black' : 'bg-amber-400 text-black'
            }`}>
              {copied ? '✓' : '1'}
            </div>
            <p className="text-white font-bold text-sm">
              {copied ? 'Link copied! ✓' : 'Copy the link below'}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={APP_URL}
              readOnly
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white/40 text-xs focus:outline-none"
            />
            <button
              onClick={copy}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
                copied
                  ? 'bg-green-400/20 border-green-400/50 text-green-400'
                  : 'bg-amber-400 border-amber-400 text-black hover:bg-amber-300'
              }`}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Step 2: Open browser */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
              2
            </div>
            <p className="text-white font-bold text-sm">
              Open {isIOS ? 'Safari' : 'Chrome'}
            </p>
          </div>
          {isIOS ? (
            <p className="text-white/50 text-xs leading-relaxed pl-10">
              Tap the <span className="text-amber-400 font-bold">share icon ⎙</span> at the bottom → select <span className="text-amber-400 font-bold">"Open in Safari"</span>. Or just open Safari manually.
            </p>
          ) : (
            <p className="text-white/50 text-xs leading-relaxed pl-10">
              Tap the <span className="text-amber-400 font-bold">3 dots ⋮</span> in the corner → select <span className="text-amber-400 font-bold">"Open in Chrome"</span>. Or just open Chrome manually.
            </p>
          )}
        </div>

        {/* Step 3: Paste and sign in */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
              3
            </div>
            <p className="text-white font-bold text-sm">Paste the link &amp; sign in</p>
          </div>
          <p className="text-white/50 text-xs leading-relaxed pl-10">
            In {isIOS ? 'Safari' : 'Chrome'}, tap the address bar, <span className="text-amber-400 font-bold">paste the link</span> you copied, and sign in with Google. You're all set! 🎉
          </p>
        </div>

        <p className="text-white/20 text-xs text-center mt-4">
          Only needed once — your browser will remember you 🍱
        </p>
      </div>
    </div>
  );
}