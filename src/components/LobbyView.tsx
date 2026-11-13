import React, { useState } from 'react';
import { Sparkles, Lock, Star, Play, Clock, BookOpen, Volume2, VolumeX, LogOut } from 'lucide-react';
import { PlayerData } from '../firebase';
import { soundEngine } from '../utils/audio';

export interface LevelConfig {
  id: number;
  name: string;
  realm: string;
  difficulty: string;
  givenCount: number;
  description: string;
}

interface LobbyViewProps {
  levels: LevelConfig[];
  playerData: PlayerData;
  onSelectLevel: (levelId: number) => void;
  onRequestLogout: () => void;
  xiaoXueAvatar: string;
  lobbyQuotes: string[];
  isMuted: boolean;
  onToggleMute: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  levels,
  playerData,
  onSelectLevel,
  onRequestLogout,
  xiaoXueAvatar,
  lobbyQuotes,
  isMuted,
  onToggleMute,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const cycleQuote = () => {
    soundEngine.playNoteMark();
    if (lobbyQuotes.length > 0) {
      setQuoteIndex(prev => (prev + 1) % lobbyQuotes.length);
    }
  };

  const currentQuote =
    lobbyQuotes.length > 0
      ? lobbyQuotes[quoteIndex]
      : '喂！站在洞府發呆做什麼？還不快選一處靈陣參悟？';

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case '入門':
        return 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40';
      case '普通':
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40';
      case '進階':
        return 'text-blue-300 border-blue-500/40 bg-blue-950/40';
      case '困難':
        return 'text-amber-300 border-amber-500/40 bg-amber-950/40';
      case '大師':
        return 'text-orange-300 border-orange-500/40 bg-orange-950/40';
      case '宗師':
        return 'text-purple-300 border-purple-500/40 bg-purple-950/40';
      case '天尊':
        return 'text-rose-300 border-rose-500/40 bg-rose-950/40';
      default:
        return 'text-slate-300 border-slate-500/40 bg-slate-800/40';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-md px-3 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-950 flex-shrink-0">
            <span className="font-serif text-sm font-bold text-white">九</span>
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-cyan-100">
              小雪的九宮靈陣2
            </h1>
            <div className="text-[10px] text-cyan-400/80 font-mono flex items-center gap-1">
              <span>陣法大廳</span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">{playerData.cultivationRealm}</span>
            </div>
          </div>
        </div>

        {/* Right Tools: Stars, Sound, Logout */}
        <div className="flex items-center gap-1.5">
          {/* Star Counter */}
          <div className="flex items-center gap-1 px-2 py-0.8 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-inner">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>{playerData.totalStars}</span>
            <span className="text-[9px] text-amber-400/60 font-mono">/36</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title={isMuted ? '開啟天籟' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Logout */}
          <button
            onClick={onRequestLogout}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-300 text-[11px] font-medium transition-colors cursor-pointer"
            title="離開洞府"
          >
            <LogOut className="w-3 h-3" />
            <span>登出</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full p-3 space-y-3 overflow-y-auto">
        {/* Xiao Xue Greeting Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/50 p-3 shadow-md flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Xiao Xue Avatar with click reaction */}
            <div
              onClick={cycleQuote}
              className="relative cursor-pointer group flex-shrink-0"
              title="點擊小雪聽傲嬌密語"
            >
              <div className="w-13 h-13 rounded-xl overflow-hidden border-2 border-cyan-400 shadow-md shadow-cyan-950/80 group-hover:border-amber-400 transition-colors">
                <img
                  src={xiaoXueAvatar}
                  alt="小雪仙子"
                  className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-cyan-600 text-[8px] font-bold text-white shadow">
                點我
              </div>
            </div>

            {/* Speech and status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 font-mono uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  九宮玄女 · 小雪
                </span>
                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
                  守護之靈
                </span>
              </div>
              <p className="text-[11px] text-cyan-100 font-medium italic leading-snug line-clamp-2">
                “{currentQuote}”
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">
                解鎖至 <span className="text-cyan-300 font-semibold">第 {playerData.unlockedLevel} 重</span> 陣法，點擊進入迎劫！
              </p>
            </div>
          </div>
        </section>

        {/* Level List: 1-Column Mobile Stage List */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>諸天九宮靈陣譜 (12重)</span>
            </h2>
            <span className="text-[10px] text-slate-400">
              已破 {Object.values(playerData.levelRecords).filter(r => r.completed).length} / 12
            </span>
          </div>

          <div className="space-y-2 pb-3">
            {levels.map(lvl => {
              const isUnlocked = lvl.id <= playerData.unlockedLevel;
              const record = playerData.levelRecords[lvl.id.toString()];
              const stars = record?.stars || 0;
              const bestTime = record?.bestTime;

              return (
                <div
                  key={lvl.id}
                  onClick={() => {
                    if (isUnlocked) {
                      soundEngine.playRunePlace();
                      onSelectLevel(lvl.id);
                    } else {
                      soundEngine.playError();
                    }
                  }}
                  className={`relative rounded-xl p-3 border transition-all flex items-center justify-between ${
                    isUnlocked
                      ? 'bg-gradient-to-r from-slate-900/90 to-slate-900/70 border-cyan-500/30 hover:border-cyan-400 active:scale-98 cursor-pointer shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/60 opacity-55 cursor-not-allowed'
                  }`}
                >
                  {/* Left: Stage info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${getDifficultyColor(lvl.difficulty)}`}>
                        {lvl.difficulty}
                      </span>
                      <span className="text-[10px] text-cyan-400/80 font-mono truncate">
                        {lvl.realm}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-100 truncate">
                      {lvl.name}
                    </h3>

                    {/* Stars and time */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map(s => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= stars
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>

                      {bestTime ? (
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-cyan-400" />
                          {formatSeconds(bestTime)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">
                          {isUnlocked ? '未通關' : '封印'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Enter / Lock button */}
                  <div className="flex-shrink-0">
                    {isUnlocked ? (
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950">
                        <Play className="w-3 h-3 fill-white" />
                        <span>入陣</span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-600">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
