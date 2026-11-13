import React, { useMemo } from 'react';
import { ShieldAlert, Sparkles, LogOut, ArrowLeft } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  quotes: string[];
  xiaoXueAvatar: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  quotes,
  xiaoXueAvatar,
}) => {
  // Pick random quote each time modal opens
  const quote = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return '你作弊！陣法還沒破解，以為登出就行了嗎？';
    }
    const idx = Math.floor(Math.random() * quotes.length);
    return quotes[idx];
  }, [isOpen, quotes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 sm:p-5 shadow-2xl shadow-amber-950/60">
        {/* Decorative corner runes */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-500/40">✦ 乾</div>
        <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-500/40">坤 ✦</div>
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-500/40">✦ 坎</div>
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-500/40">離 ✦</div>

        {/* Xiao Xue Avatar & Tsundere Speech */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-500/30">
              <img
                src={xiaoXueAvatar}
                alt="小雪仙子"
                className="w-full h-full object-cover object-top scale-110"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shadow">
              <ShieldAlert className="w-2.5 h-2.5" />
              傲嬌防線
            </div>
          </div>

          <h3 className="text-base font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            小雪的嚴正警告
          </h3>

          <div className="relative mt-2.5 mb-3 p-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 text-cyan-100 text-xs leading-relaxed shadow-inner">
            <p className="font-medium text-slate-200 italic">“{quote}”</p>
            <div className="mt-1 text-[9px] text-cyan-400/80 font-mono">—— 九宮靈陣守護者 · 小雪</div>
          </div>

          <p className="text-[11px] text-slate-400 mb-4">
            若此刻登出仙籍，當前陣法真元將歸於虛無，道友確定要離開嗎？
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={onCancel}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-cyan-950 transition-transform active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              繼續破陣
            </button>
            <button
              onClick={onConfirm}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-300 font-medium text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              確認登出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
