import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface LoginViewProps {
  onGoogleLogin: () => void;
  onGuestPlay: () => void;
  quotes: string[];
  xiaoXueAvatar: string;
  isLoading: boolean;
  authNotice?: string | null;
  onClearAuthNotice?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onGoogleLogin,
  onGuestPlay,
  quotes,
  xiaoXueAvatar,
  isLoading,
  authNotice,
  onClearAuthNotice,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (!quotes || quotes.length === 0) return;
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [quotes]);

  const currentQuote =
    authNotice ||
    (quotes && quotes.length > 0
      ? quotes[quoteIndex]
      : '哼，連仙籍（Google帳號）都不敢留，還妄想破本姑娘的九宮靈陣？');

  return (
    <div className="relative w-full h-full flex flex-col justify-between px-4 py-3.5 bg-gradient-to-b from-[#060e1d] via-[#040813] to-[#02050b] select-none overflow-hidden">
      {/* Ambient Celestial Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 1. TOP: Title & Branding Header */}
      <div className="relative z-10 flex flex-col items-center text-center pt-0.5 flex-shrink-0">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[9px] text-cyan-300 font-mono tracking-widest uppercase mb-1">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span>XIAOXUE SUDOKU 2.0</span>
        </div>

        {/* Grand Title */}
        <h1 className="text-2xl font-black tracking-widest bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(56,189,248,0.4)]">
          小雪的九宮靈陣2
        </h1>
        <p className="text-[10px] text-slate-400 font-serif tracking-wider mt-0.5">
          九天玄雷淬靈陣 · 傲嬌仙子伴長生
        </p>
      </div>

      {/* 2. CENTER: Xiao Xue Picture + Dialogue Box Directly Underneath */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto py-1 space-y-2 min-h-0">
        {/* Xiao Xue Character Picture */}
        <div className="relative w-40 h-54 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(56,189,248,0.25)] bg-slate-950/90 group flex-shrink-0">
          <img
            src={xiaoXueAvatar}
            alt="小雪仙子"
            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
          />
          {/* Subtle bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 pointer-events-none" />
          <div className="absolute bottom-1.5 inset-x-0 text-center">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-cyan-400/50 text-cyan-200 text-[9px] font-bold tracking-wider shadow">
              九宮玄女 · 小雪
            </div>
          </div>
        </div>

        {/* Dialogue Box Directly Under Xiao Xue's Picture */}
        <div 
          onClick={() => {
            onClearAuthNotice?.();
            if (quotes && quotes.length > 0) {
              setQuoteIndex(prev => (prev + 1) % quotes.length);
            }
          }}
          className="w-full max-w-[340px] cursor-pointer group/bubble"
          title="點擊切換小雪傳音"
        >
          <div
            className={`relative rounded-2xl px-3.5 py-2.5 bg-gradient-to-r from-slate-900/95 via-cyan-950/80 to-purple-950/70 border shadow-lg shadow-cyan-950/60 backdrop-blur-md transition-colors ${
              authNotice ? 'border-amber-400/60' : 'border-cyan-400/50'
            }`}
          >
            {/* Speech pointer pointing up to Xiao Xue above */}
            <div
              className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-900 border-t border-l ${
                authNotice ? 'border-amber-400/60' : 'border-cyan-400/50'
              }`}
            />

            <div className="flex items-center gap-2 relative z-10">
              <span className="text-sm select-none">💬</span>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-amber-300 font-mono tracking-wider">
                    {authNotice ? '仙籍提示：' : '小雪傳音：'}
                  </span>
                  <span className="text-[8px] text-cyan-400/60 font-mono">點擊切換</span>
                </div>
                <p className="text-[11px] text-cyan-100 font-medium italic leading-snug line-clamp-2 mt-0.5">
                  “{currentQuote}”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM: Login Actions */}
      <div className="relative z-10 w-full max-w-[340px] mx-auto space-y-1.5 flex-shrink-0 pb-1">
        {/* Google Sign-in Button */}
        <button
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-950/40 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.41 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.99 0 12s.45 3.84 1.25 5.43l4.03-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.59 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span>以 Google 仙籍登入</span>
        </button>

        {/* Guest Play Button */}
        <button
          onClick={onGuestPlay}
          disabled={isLoading}
          className="w-full py-2 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <span>遊歷紅塵 (訪客試玩)</span>
        </button>

        <p className="text-[9px] text-slate-500 text-center font-mono">
          * 訪客進度暫存於法寶，登入仙籍自動同步天道存檔
        </p>
      </div>
    </div>
  );
};
