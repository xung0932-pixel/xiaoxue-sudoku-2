import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Edit3,
  RotateCcw,
  Eraser,
  HelpCircle,
  Clock,
  Star,
  LogOut,
  FastForward,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import {
  SudokuPuzzle,
  generatePuzzleForLevel,
  copyGrid,
  checkWin,
  getCellConflicts,
  GRID_SIZE,
} from '../utils/sudoku';
import { soundEngine } from '../utils/audio';
import { LevelConfig } from './LobbyView';
import { LightningCanvas } from './LightningCanvas';

export type TribulationPhase =
  | 'preview'
  | 'dialogue_entrance'
  | 'wave1'
  | 'wave2'
  | 'wave3'
  | 'dialogue_finished'
  | 'playing'
  | 'victory';

interface GameBoardViewProps {
  level: LevelConfig;
  onBackToLobby: () => void;
  onRequestLogout: () => void;
  onLevelComplete: (levelId: number, stars: number, timeSeconds: number) => void;
  xiaoXueAvatar: string;
  xiaoXueConfig: {
    name: string;
    tribulationEntrance: string;
    tribulationFinished: string;
    hintQuotes: string[];
    conflictQuotes: string[];
    victoryQuotes: string[];
  };
  isMuted: boolean;
  onToggleMute: () => void;
}

interface MoveHistory {
  row: number;
  col: number;
  prevVal: number;
  newVal: number;
  prevNotes: number[];
  newNotes: number[];
}

export const GameBoardView: React.FC<GameBoardViewProps> = ({
  level,
  onBackToLobby,
  onRequestLogout,
  onLevelComplete,
  xiaoXueAvatar,
  xiaoXueConfig,
  isMuted,
  onToggleMute,
}) => {
  // Puzzle state
  const [puzzle, setPuzzle] = useState<SudokuPuzzle | null>(null);
  const [currentGrid, setCurrentGrid] = useState<number[][]>([]);
  // Notes matrix: 9x9 set of numbers
  const [notesGrid, setNotesGrid] = useState<number[][][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
  );

  // Excavated cell visual tracking during tribulation
  const [excavatedSet, setExcavatedSet] = useState<Set<string>>(new Set());
  const [currentWaveBatch, setCurrentWaveBatch] = useState<number>(0);

  // Phase
  const [phase, setPhase] = useState<TribulationPhase>('preview');
  const [screenShake, setScreenShake] = useState(false);
  const [lightningActive, setLightningActive] = useState(false);

  // Selection & Tools
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [history, setHistory] = useState<MoveHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Timer & Stats
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeQuote, setActiveQuote] = useState<string>('');
  const [hintCount, setHintCount] = useState(3);
  const [victoryStats, setVictoryStats] = useState<{ stars: number; time: number } | null>(null);

  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef(xiaoXueConfig);
  useEffect(() => {
    configRef.current = xiaoXueConfig;
  }, [xiaoXueConfig]);

  // Start playing callback with puzzle excavation safeguard
  const handleStartPlaying = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (puzzle) {
      const allDug = new Set<string>();
      puzzle.dugCells.forEach(cell => allDug.add(`${cell.row}-${cell.col}`));
      setExcavatedSet(allDug);
      setCurrentGrid(copyGrid(puzzle.initialPuzzle));
    }
    setPhase('playing');
    setActiveQuote('');
    soundEngine.playRunePlace();
  }, [puzzle]);

  const startWave1 = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    setPhase('wave1');
  }, []);

  // Initialize Puzzle on level mount
  useEffect(() => {
    const newPuz = generatePuzzleForLevel(level.id, level.givenCount);
    setPuzzle(newPuz);
    // Start with complete solution displayed for Preview Phase
    setCurrentGrid(copyGrid(newPuz.solution));
    setExcavatedSet(new Set());
    setNotesGrid(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])));
    setHistory([]);
    setHistoryIndex(-1);
    setTimerSeconds(0);
    setPhase('preview');
    setActiveQuote('');
    setVictoryStats(null);
  }, [level.id, level.givenCount]);

  // Trigger screen shake & audio
  const triggerShake = (power: number) => {
    setScreenShake(true);
    setLightningActive(true);
    soundEngine.playThunder(power);

    setTimeout(() => {
      setScreenShake(false);
    }, 450);

    setTimeout(() => {
      setLightningActive(false);
    }, 700);
  };

  // Phase Transition Machine
  useEffect(() => {
    if (!puzzle) return;

    if (phase === 'preview') {
      // 1. Brief preview of perfect solution (approx 1.2s)
      phaseTimerRef.current = setTimeout(() => {
        setPhase('dialogue_entrance');
        setActiveQuote(configRef.current.tribulationEntrance);
      }, 1200);
    } else if (phase === 'dialogue_entrance') {
      // 2. Xiao Xue dialogue pops up: auto-advance to Wave 1 after 2.8s
      phaseTimerRef.current = setTimeout(() => {
        startWave1();
      }, 2800);
    } else if (phase === 'wave1') {
      // Wave 1 strike
      triggerShake(0.9);
      setCurrentWaveBatch(1);
      // Dig out batch 1
      const batch1 = puzzle.batches[0];
      setExcavatedSet(prev => {
        const next = new Set(prev);
        batch1.forEach(cell => next.add(`${cell.row}-${cell.col}`));
        return next;
      });
      setCurrentGrid(prev => {
        const next = copyGrid(prev);
        batch1.forEach(cell => {
          next[cell.row][cell.col] = 0;
        });
        return next;
      });

      phaseTimerRef.current = setTimeout(() => {
        setPhase('wave2');
      }, 850);
    } else if (phase === 'wave2') {
      // Wave 2 strike
      triggerShake(1.1);
      setCurrentWaveBatch(2);
      const batch2 = puzzle.batches[1];
      setExcavatedSet(prev => {
        const next = new Set(prev);
        batch2.forEach(cell => next.add(`${cell.row}-${cell.col}`));
        return next;
      });
      setCurrentGrid(prev => {
        const next = copyGrid(prev);
        batch2.forEach(cell => {
          next[cell.row][cell.col] = 0;
        });
        return next;
      });

      phaseTimerRef.current = setTimeout(() => {
        setPhase('wave3');
      }, 850);
    } else if (phase === 'wave3') {
      // Wave 3 strike
      triggerShake(1.3);
      setCurrentWaveBatch(3);
      const batch3 = puzzle.batches[2];
      setExcavatedSet(prev => {
        const next = new Set(prev);
        batch3.forEach(cell => next.add(`${cell.row}-${cell.col}`));
        return next;
      });
      // At this point, the remaining cells are strictly initialPuzzle
      setCurrentGrid(copyGrid(puzzle.initialPuzzle));

      phaseTimerRef.current = setTimeout(() => {
        setPhase('dialogue_finished');
        setActiveQuote(configRef.current.tribulationFinished);
      }, 950);
    } else if (phase === 'dialogue_finished') {
      // Xiao Xue's follow up: automatically starts playing after 1.5s
      phaseTimerRef.current = setTimeout(() => {
        handleStartPlaying();
      }, 1500);
    }

    return () => {
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
      }
    };
  }, [phase, puzzle, startWave1, handleStartPlaying]);

  // Skip the tribulation sequence directly to playing
  const handleSkipAnimation = () => {
    handleStartPlaying();
  };

  // Timer Tick during Playing phase
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Check victory condition
  useEffect(() => {
    if (phase !== 'playing' || !puzzle) return;
    if (checkWin(currentGrid, puzzle.solution)) {
      // Solved!
      setPhase('victory');
      soundEngine.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#c084fc', '#fbbf24', '#ffffff'],
      });

      // Calculate star rating:
      // Level difficulty based time target
      let stars = 3;
      if (timerSeconds > 600) stars = 1;
      else if (timerSeconds > 360) stars = 2;

      setVictoryStats({ stars, time: timerSeconds });
      onLevelComplete(level.id, stars, timerSeconds);

      // Random victory quote
      const quotes = xiaoXueConfig.victoryQuotes;
      if (quotes.length > 0) {
        setActiveQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      }
    }
  }, [currentGrid, phase, puzzle, timerSeconds, level.id, onLevelComplete, xiaoXueConfig.victoryQuotes]);

  // Keyboard support (1-9, Delete/Backspace, N for note mode)
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
      } else if (e.key.toLowerCase() === 'n') {
        setIsNoteMode(prev => !prev);
        soundEngine.playNoteMark();
      } else if (e.key === 'ArrowUp' && selectedCell) {
        setSelectedCell(prev => prev && { ...prev, row: Math.max(0, prev.row - 1) });
      } else if (e.key === 'ArrowDown' && selectedCell) {
        setSelectedCell(prev => prev && { ...prev, row: Math.min(8, prev.row + 1) });
      } else if (e.key === 'ArrowLeft' && selectedCell) {
        setSelectedCell(prev => prev && { ...prev, col: Math.max(0, prev.col - 1) });
      } else if (e.key === 'ArrowRight' && selectedCell) {
        setSelectedCell(prev => prev && { ...prev, col: Math.min(8, prev.col + 1) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, isNoteMode, currentGrid]);

  // Place number or candidate note
  const handleNumberInput = useCallback((num: number) => {
    if (!selectedCell || !puzzle || phase !== 'playing') return;
    const { row, col } = selectedCell;

    // Initial givens cannot be edited
    if (puzzle.initialPuzzle[row][col] !== 0) {
      soundEngine.playError();
      return;
    }

    if (isNoteMode) {
      // Toggle note candidate
      soundEngine.playNoteMark();
      setNotesGrid(prev => {
        const next = prev.map(r => r.map(c => [...c]));
        const currentNotes = next[row][col];
        if (currentNotes.includes(num)) {
          next[row][col] = currentNotes.filter(n => n !== num);
        } else {
          next[row][col] = [...currentNotes, num].sort((a, b) => a - b);
        }
        return next;
      });
    } else {
      // True number placement
      const prevVal = currentGrid[row][col];
      const prevNotes = [...notesGrid[row][col]];

      if (prevVal === num) return; // already set

      soundEngine.playRunePlace();

      // Record history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        row,
        col,
        prevVal,
        newVal: num,
        prevNotes,
        newNotes: [],
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Clear notes in this cell
      setNotesGrid(prev => {
        const next = prev.map(r => r.map(c => [...c]));
        next[row][col] = [];
        return next;
      });

      // Update grid
      setCurrentGrid(prev => {
        const next = copyGrid(prev);
        next[row][col] = num;

        // Check if placed incorrectly
        if (num !== puzzle.solution[row][col]) {
          const conflicts = xiaoXueConfig.conflictQuotes;
          if (conflicts.length > 0) {
            setActiveQuote(conflicts[Math.floor(Math.random() * conflicts.length)]);
          }
        }
        return next;
      });
    }
  }, [selectedCell, puzzle, phase, isNoteMode, currentGrid, notesGrid, history, historyIndex, xiaoXueConfig.conflictQuotes]);

  // Erase cell
  const handleErase = () => {
    if (!selectedCell || !puzzle || phase !== 'playing') return;
    const { row, col } = selectedCell;
    if (puzzle.initialPuzzle[row][col] !== 0) return;

    soundEngine.playNoteMark();
    const prevVal = currentGrid[row][col];
    const prevNotes = [...notesGrid[row][col]];

    if (prevVal !== 0 || prevNotes.length > 0) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        row,
        col,
        prevVal,
        newVal: 0,
        prevNotes,
        newNotes: [],
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      setCurrentGrid(prev => {
        const next = copyGrid(prev);
        next[row][col] = 0;
        return next;
      });

      setNotesGrid(prev => {
        const next = prev.map(r => r.map(c => [...c]));
        next[row][col] = [];
        return next;
      });
    }
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex < 0 || phase !== 'playing') return;
    const item = history[historyIndex];
    soundEngine.playNoteMark();

    setCurrentGrid(prev => {
      const next = copyGrid(prev);
      next[item.row][item.col] = item.prevVal;
      return next;
    });

    setNotesGrid(prev => {
      const next = prev.map(r => r.map(c => [...c]));
      next[item.row][item.col] = [...item.prevNotes];
      return next;
    });

    setSelectedCell({ row: item.row, col: item.col });
    setHistoryIndex(prev => prev - 1);
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || phase !== 'playing') return;
    const item = history[historyIndex + 1];
    soundEngine.playNoteMark();

    setCurrentGrid(prev => {
      const next = copyGrid(prev);
      next[item.row][item.col] = item.newVal;
      return next;
    });

    setNotesGrid(prev => {
      const next = prev.map(r => r.map(c => [...c]));
      next[item.row][item.col] = [...item.newNotes];
      return next;
    });

    setSelectedCell({ row: item.row, col: item.col });
    setHistoryIndex(prev => prev + 1);
  };

  // Hint / Xiao Xue's Revelation
  const handleHint = () => {
    if (!puzzle || phase !== 'playing' || hintCount <= 0) return;

    // Find an empty cell or incorrect cell
    const candidates: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c] === 0 || currentGrid[r][c] !== puzzle.solution[r][c]) {
          candidates.push({ row: r, col: c });
        }
      }
    }

    if (candidates.length === 0) return;

    soundEngine.playHint();
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const correctVal = puzzle.solution[target.row][target.col];

    setCurrentGrid(prev => {
      const next = copyGrid(prev);
      next[target.row][target.col] = correctVal;
      return next;
    });

    setNotesGrid(prev => {
      const next = prev.map(r => r.map(c => [...c]));
      next[target.row][target.col] = [];
      return next;
    });

    setSelectedCell(target);
    setHintCount(prev => prev - 1);

    const hints = xiaoXueConfig.hintQuotes;
    if (hints.length > 0) {
      setActiveQuote(hints[Math.floor(Math.random() * hints.length)]);
    }
  };

  // Count instances of each number currently placed
  const numberCounts = Array.from({ length: 10 }, () => 0);
  currentGrid.forEach(row => {
    row.forEach(val => {
      if (val >= 1 && val <= 9) numberCounts[val]++;
    });
  });

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedValue = selectedCell ? currentGrid[selectedCell.row][selectedCell.col] : 0;

  return (
    <div
      className={`relative w-full h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Lightning Canvas overlay during tribulation */}
      <LightningCanvas active={lightningActive} waveNumber={currentWaveBatch} />

      {/* Top Game Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-md px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Explicit Back to Lobby Button */}
          <button
            onClick={() => {
              soundEngine.playNoteMark();
              onBackToLobby();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 text-xs font-semibold transition-all cursor-pointer shadow-md"
            title="退出當前陣法，返回洞府大廳"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>返回大廳</span>
          </button>

          <div className="border-l border-slate-800 pl-2">
            <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1">
              <span className="truncate max-w-[110px]">{level.name}</span>
              <span className="text-[9px] font-normal px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                {level.difficulty}
              </span>
            </h2>
          </div>
        </div>

        {/* Center: Timer */}
        <div className="flex items-center gap-1 px-2 py-0.8 rounded-xl bg-slate-900/90 border border-slate-700/80 text-cyan-300 font-mono text-xs font-semibold shadow-inner">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{formatTime(timerSeconds)}</span>
        </div>

        {/* Right Tools: Mute & Tsundere Logout */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title={isMuted ? '開啟天籟' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          <button
            onClick={onRequestLogout}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-300 text-xs font-medium transition-colors cursor-pointer"
            title="登出仙籍"
          >
            <LogOut className="w-3 h-3" />
            <span>登出</span>
          </button>
        </div>
      </header>

      {/* Main Board Arena: Direct top-to-bottom fit, NO scrolling */}
      <main className="flex-1 w-full px-2 pt-1 pb-1 flex flex-col items-center justify-start min-h-0 overflow-hidden">
        {/* 兩行空白間隙：狀態列與小雪區域之間的獨立緩衝空間 (Exactly 2 text lines of breathing space) */}
        <div className="h-7 w-full flex-shrink-0" aria-hidden="true" />

        {/* Xiao Xue Independent Character & Dialogue Realm */}
        <div className="w-full max-w-[min(88vw,325px)] flex items-center gap-2.5 mb-2 flex-shrink-0">
          {/* 1. Independent Character Image Area: Large, prominent, and distinct */}
          <div
            className="relative flex-shrink-0 cursor-pointer group"
            onClick={() => {
              if (phase === 'dialogue_finished') {
                handleStartPlaying();
              } else if (phase === 'dialogue_entrance') {
                startWave1();
              } else if (phase === 'playing') {
                soundEngine.playNoteMark();
                const allQuotes = [
                  ...xiaoXueConfig.hintQuotes,
                  ...xiaoXueConfig.conflictQuotes,
                  '喂！看著本姑娘做什麼？還不專心解陣！',
                  '這點玄機都參不透，還妄想得道飛昇？',
                ];
                setActiveQuote(allQuotes[Math.floor(Math.random() * allQuotes.length)]);
              }
            }}
            title="點擊小雪仙子交流"
          >
            <div className="w-18 h-26 sm:w-20 sm:h-28 rounded-xl overflow-hidden border-2 border-cyan-400/80 shadow-lg shadow-cyan-950/80 bg-slate-950 relative">
              <img
                src={xiaoXueAvatar}
                alt="小雪仙子"
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-1 inset-x-0 text-center">
                <span className="text-[8px] font-bold text-cyan-200 bg-cyan-950/90 px-1 py-0.2 rounded border border-cyan-500/40 font-mono">
                  小雪
                </span>
              </div>
            </div>
          </div>

          {/* 2. Independent Dialogue Box Area: Standalone RPG dialogue container */}
          <div
            onClick={() => {
              if (phase === 'dialogue_finished') {
                handleStartPlaying();
              } else if (phase === 'dialogue_entrance') {
                startWave1();
              } else if (phase === 'preview') {
                handleSkipAnimation();
              } else if (phase === 'playing') {
                soundEngine.playNoteMark();
                const allQuotes = [
                  ...xiaoXueConfig.hintQuotes,
                  ...xiaoXueConfig.conflictQuotes,
                  '喂！看著本姑娘做什麼？還不專心解陣！',
                  '這點玄機都參不透，還妄想得道飛昇？',
                ];
                setActiveQuote(allQuotes[Math.floor(Math.random() * allQuotes.length)]);
              }
            }}
            className="flex-1 min-w-0 h-26 sm:h-28 flex flex-col justify-between p-2 rounded-xl bg-gradient-to-br from-slate-900/95 via-slate-900 to-purple-950/40 border border-purple-500/40 shadow-md relative cursor-pointer group"
            title="點擊對話框可互動"
          >
            {/* Speech pointer pointing left to Xiao Xue */}
            <div className="absolute top-5 -left-1 w-2.5 h-2.5 rotate-45 bg-slate-900 border-b border-l border-purple-500/40" />

            {/* Top row: Speaker tag & action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[9px] font-bold text-amber-300 font-mono">
                  {phase === 'wave1' || phase === 'wave2' || phase === 'wave3' ? '天劫洗禮' : '九宮玄女 · 小雪'}
                </span>
              </div>

              {phase === 'preview' && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleSkipAnimation();
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer flex items-center gap-0.5"
                >
                  <FastForward className="w-2.5 h-2.5" /> 略過
                </button>
              )}

              {phase === 'dialogue_entrance' && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    startWave1();
                  }}
                  className="text-[9px] px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer flex items-center gap-0.5 shadow"
                >
                  <Zap className="w-2.5 h-2.5" /> 迎劫
                </button>
              )}

              {phase === 'dialogue_finished' && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleStartPlaying();
                  }}
                  className="text-[9px] px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer flex items-center gap-0.5 shadow animate-pulse"
                >
                  <Zap className="w-2.5 h-2.5" /> 破陣
                </button>
              )}
            </div>

            {/* Middle: Dialogue quote */}
            <div className="my-auto py-0.5">
              <p className="text-[10px] sm:text-[11px] text-purple-100 font-medium italic leading-tight line-clamp-3">
                “{
                  phase === 'preview'
                    ? '哼，仔細看好了！這是本陣原本的真元天象，稍後天劫一落，唯有還原方可破陣！'
                    : phase === 'dialogue_entrance'
                    ? xiaoXueConfig.tribulationEntrance
                    : phase === 'wave1'
                    ? '第一波紫極天劫降臨！劈散首批真元！'
                    : phase === 'wave2'
                    ? '第二波九天玄雷狂轟中，殘局漸現！'
                    : phase === 'wave3'
                    ? '第三波滅世雷劫洗地！留存初始真元殘局！'
                    : phase === 'dialogue_finished'
                    ? xiaoXueConfig.tribulationFinished
                    : activeQuote || '以神識推演九宮，凡真元相衝者皆為偽道！'
                }”
              </p>
            </div>

            {/* Bottom: Context indicator */}
            <div className="text-[8px] text-cyan-400/70 font-mono flex items-center justify-between">
              <span>
                {phase === 'playing'
                  ? '點擊小雪或對話框可交流'
                  : phase === 'dialogue_finished'
                  ? '天劫已平息 · 點擊直接破陣'
                  : '天劫儀式進行中'}
              </span>
              <span className="text-slate-400">{level.difficulty}</span>
            </div>
          </div>
        </div>

        {/* 9x9 Sudoku Board: Scaled proportionally to never exceed viewport height */}
        <div className="relative p-1 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/60 celestial-border w-full max-w-[min(88vw,330px)] aspect-square flex-shrink-0 mb-1.5">
          <div className="grid grid-cols-9 gap-0.5 bg-cyan-950/40 p-0.5 rounded-lg w-full h-full">
            {currentGrid.map((row, r) =>
              row.map((val, c) => {
                const cellKey = `${r}-${c}`;
                const isGiven = puzzle ? puzzle.initialPuzzle[r][c] !== 0 : false;
                const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                const isRelated =
                  selectedCell &&
                  (selectedCell.row === r ||
                    selectedCell.col === c ||
                    (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) &&
                      Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));
                const isSameVal = selectedValue > 0 && val === selectedValue;
                const isConflict = val > 0 && getCellConflicts(currentGrid, r, c);
                const isJustExcavated = excavatedSet.has(cellKey);
                const cellNotes = notesGrid[r][c] || [];

                // 3x3 block borders
                const borderRight = c % 3 === 2 && c !== 8 ? 'border-r-2 border-cyan-500/60' : '';
                const borderBottom = r % 3 === 2 && r !== 8 ? 'border-b-2 border-cyan-500/60' : '';

                return (
                  <div
                    key={cellKey}
                    onClick={() => {
                      if (phase === 'playing') {
                        soundEngine.playNoteMark();
                        setSelectedCell({ row: r, col: c });
                      }
                    }}
                    className={`relative w-full h-full flex items-center justify-center font-bold text-sm sm:text-base select-none transition-all rounded-[3px] cursor-pointer ${borderRight} ${borderBottom} ${
                      isSelected
                        ? 'bg-cyan-500/35 ring-2 ring-cyan-300 shadow-md shadow-cyan-500/40 z-10'
                        : isSameVal
                        ? 'bg-cyan-900/50 text-cyan-100 ring-1 ring-cyan-500/40'
                        : isRelated
                        ? 'bg-slate-800/80'
                        : 'bg-slate-900/60 hover:bg-slate-800/60'
                    } ${
                      isConflict ? 'bg-rose-950/60 ring-2 ring-rose-500/80 text-rose-300' : ''
                    }`}
                  >
                    {/* Tribulation smoke & flash particle badge */}
                    {isJustExcavated && (phase === 'wave1' || phase === 'wave2' || phase === 'wave3') && (
                      <span className="absolute inset-0 rounded-[3px] bg-purple-500/40 animate-ping pointer-events-none" />
                    )}

                    {val !== 0 ? (
                      <span
                        className={`${
                          isGiven
                            ? 'text-cyan-300 font-extrabold'
                            : 'text-amber-300 font-bold'
                        } ${isConflict ? 'text-rose-400' : ''}`}
                      >
                        {val}
                      </span>
                    ) : (
                      /*神識推演: 3x3 Mini Pencil-mark Note Matrix*/
                      <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5 pointer-events-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <div
                            key={n}
                            className="flex items-center justify-center text-[7px] sm:text-[8px] font-mono leading-none text-purple-300/90 font-medium"
                          >
                            {cellNotes.includes(n) ? n : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sudoku Action Toolbar & Number Pad: Always present, eliminating layout jump */}
        <div
          className={`w-full max-w-[min(88vw,330px)] space-y-1.5 flex-shrink-0 transition-opacity duration-300 ${
            phase === 'playing' ? 'opacity-100' : 'opacity-30 pointer-events-none'
          }`}
        >
            {/* Action Tools Row */}
            <div className="grid grid-cols-5 gap-1.5">
              {/* Note Mode Toggle */}
              <button
                onClick={() => {
                  soundEngine.playNoteMark();
                  setIsNoteMode(prev => !prev);
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                  isNoteMode
                    ? 'bg-purple-900/60 border-purple-400 text-purple-200 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/40'
                }`}
                title="切換神識推演（筆記模式）"
              >
                <Edit3 className={`w-3.5 h-3.5 ${isNoteMode ? 'text-purple-300' : 'text-slate-400'}`} />
                <span>{isNoteMode ? '推演中' : '填數'}</span>
              </button>

              {/* Erase */}
              <button
                onClick={handleErase}
                className="py-1.5 px-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-white text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                title="抹去當前格真元"
              >
                <Eraser className="w-3.5 h-3.5 text-cyan-400" />
                <span>抹去</span>
              </button>

              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={historyIndex < 0}
                className="py-1.5 px-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 disabled:opacity-40 text-slate-300 hover:text-white text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                title="悔棋 / 撤銷上一步"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>撤銷</span>
              </button>

              {/* Redo */}
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="py-1.5 px-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 disabled:opacity-40 text-slate-300 hover:text-white text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                title="重做下一步"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400 -scale-x-100" />
                <span>重做</span>
              </button>

              {/* Hint */}
              <button
                onClick={handleHint}
                disabled={hintCount <= 0}
                className="py-1.5 px-1 rounded-xl bg-gradient-to-b from-amber-950/50 to-slate-900 border border-amber-500/40 text-amber-300 disabled:opacity-40 text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow"
                title="求助小雪仙子點化一格"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>靈光 ({hintCount})</span>
              </button>
            </div>

            {/* 1-9 Number Keypad */}
            <div className="grid grid-cols-9 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                const count = numberCounts[num];
                const isFinished = count >= 9;

                return (
                  <button
                    key={num}
                    onClick={() => handleNumberInput(num)}
                    disabled={isFinished}
                    className={`py-2 rounded-xl text-sm sm:text-base font-bold flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 shadow ${
                      isFinished
                        ? 'bg-slate-900/40 border border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                        : isNoteMode
                        ? 'bg-slate-900 hover:bg-purple-950/60 border border-purple-500/40 text-purple-200 hover:border-purple-400'
                        : 'bg-slate-900 hover:bg-cyan-950/60 border border-cyan-500/40 text-cyan-100 hover:border-cyan-300'
                    }`}
                  >
                    <span>{num}</span>
                    <span className="text-[8px] font-mono font-normal opacity-70">
                      {isFinished ? '✓' : `${9 - count}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


        {/* Victory Celebration Modal */}
        {phase === 'victory' && victoryStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 via-[#0a1222] to-slate-950 p-6 sm:p-8 text-center shadow-2xl shadow-amber-950">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-amber-400 shadow-xl shadow-amber-500/30">
                <img
                  src={xiaoXueAvatar}
                  alt="小雪仙子"
                  className="w-full h-full object-cover object-top scale-110"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                陣法圓滿 · 功德無量
              </div>

              <h3 className="text-2xl font-extrabold text-white tracking-wider">
                {level.name} 破除成功！
              </h3>

              {/* Star Rating Display */}
              <div className="flex items-center justify-center gap-2 my-4">
                {[1, 2, 3].map(s => (
                  <Star
                    key={s}
                    className={`w-8 h-8 ${
                      s <= victoryStats.stars
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 mb-5">
                <div className="text-xs text-cyan-300/80 mb-1">
                  破陣耗時：<span className="font-mono text-cyan-100 font-bold">{formatTime(victoryStats.time)}</span>
                </div>
                <p className="text-xs text-slate-300 italic font-medium">
                  “{activeQuote || '哼……勉強算你過關吧！不過下一重陣法本姑娘絕不會放水！'}”
                </p>
                <div className="text-[10px] text-cyan-400/60 mt-1">—— 小雪仙子言</div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onBackToLobby}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all cursor-pointer"
                >
                  返回大廳
                </button>
                <button
                  onClick={onBackToLobby}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
                >
                  參悟下一陣
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
