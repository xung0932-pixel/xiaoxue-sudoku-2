import React, { useState, useEffect } from 'react';
import staticConfig from './game_config.json';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  loadUserData,
  syncLevelCompletion,
  getLocalFallbackData,
  PlayerData,
} from './firebase';
import { soundEngine } from './utils/audio';
import { LoginView } from './components/LoginView';
import { LobbyView, LevelConfig } from './components/LobbyView';
import { GameBoardView } from './components/GameBoardView';
import { LogoutModal } from './components/LogoutModal';
import { User } from 'firebase/auth';

type AppScreen = 'login' | 'lobby' | 'game';

export default function App() {
  const [config, setConfig] = useState(staticConfig);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData>(getLocalFallbackData());
  const [screen, setScreen] = useState<AppScreen>('login');
  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);

  // Attempt dynamic fetch from /game_config.json
  useEffect(() => {
    fetch('/game_config.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.xiaoXue) {
          setConfig(data);
        }
      })
      .catch(err => {
        console.warn('Using bundled game config:', err);
      });
  }, []);

  // Monitor Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setIsAuthLoading(false);
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await loadUserData(user);
          setPlayerData(profile);
          setScreen(prev => (prev === 'login' ? 'lobby' : prev));
        } catch (err) {
          console.error('Failed to load user profile:', err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    soundEngine.playRunePlace();
    setAuthNotice(null);
    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profile = await loadUserData(user);
      setPlayerData(profile);
      setScreen('lobby');
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthNotice('道友方才關掉了仙籍玉簡？若暫時不綁定，點下方「遊歷紅塵」亦可先行試煉！');
      } else if (code === 'auth/popup-blocked') {
        setAuthNotice('瀏覽器攔截了登入彈窗，請允許彈出視窗後重試，或先選擇訪客試玩。');
      } else {
        setAuthNotice('仙籍連結暫時受阻，請稍後再試，或先選擇「遊歷紅塵（訪客試玩）」。');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGuestPlay = () => {
    soundEngine.playRunePlace();
    setAuthNotice(null);
    setScreen('lobby');
  };

  const handleToggleMute = () => {
    soundEngine.isMuted = !soundEngine.isMuted;
    setIsMuted(soundEngine.isMuted);
    if (!soundEngine.isMuted) {
      soundEngine.playRunePlace();
    }
  };

  const handleSelectLevel = (levelId: number) => {
    setActiveLevelId(levelId);
    setScreen('game');
  };

  const handleBackToLobby = () => {
    setScreen('lobby');
  };

  const handleLevelComplete = async (levelId: number, stars: number, timeSeconds: number) => {
    const updated = await syncLevelCompletion(
      currentUser,
      playerData,
      levelId,
      stars,
      timeSeconds,
      config.levels.length
    );
    setPlayerData(updated);
  };

  const handleOpenLogoutModal = () => {
    soundEngine.playNoteMark();
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    soundEngine.playRunePlace();
    setShowLogoutModal(false);
    try {
      await signOut(auth);
      setPlayerData(getLocalFallbackData());
      setScreen('login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const activeLevel = config.levels.find(l => l.id === activeLevelId) || config.levels[0];

  return (
    /* Outer desktop background framing the 9:16 mobile canvas */
    <div className="h-[100dvh] w-full bg-[#030712] flex items-center justify-center p-0 sm:p-2 overflow-hidden">
      {/* 9:16 Mobile Phone Viewport Shell */}
      <div className="relative w-full max-w-[420px] h-full sm:h-[min(100dvh,820px)] bg-slate-950 text-slate-100 flex flex-col overflow-hidden sm:rounded-2xl sm:border sm:border-cyan-500/30 sm:shadow-2xl">
        {screen === 'login' && (
          <LoginView
            onGoogleLogin={handleGoogleLogin}
            onGuestPlay={handleGuestPlay}
            quotes={config.xiaoXue.loginQuotes}
            xiaoXueAvatar={config.xiaoXue.avatar}
            isLoading={isAuthLoading}
            authNotice={authNotice}
            onClearAuthNotice={() => setAuthNotice(null)}
          />
        )}

        {screen === 'lobby' && (
          <LobbyView
            levels={config.levels as LevelConfig[]}
            playerData={playerData}
            onSelectLevel={handleSelectLevel}
            onRequestLogout={handleOpenLogoutModal}
            xiaoXueAvatar={config.xiaoXue.avatar}
            lobbyQuotes={config.xiaoXue.lobbyIdleQuotes}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {screen === 'game' && activeLevel && (
          <GameBoardView
            level={activeLevel as LevelConfig}
            onBackToLobby={handleBackToLobby}
            onRequestLogout={handleOpenLogoutModal}
            onLevelComplete={handleLevelComplete}
            xiaoXueAvatar={config.xiaoXue.avatar}
            xiaoXueConfig={config.xiaoXue}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Tsundere Logout Modal */}
        <LogoutModal
          isOpen={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
          quotes={config.xiaoXue.logoutWarnings}
          xiaoXueAvatar={config.xiaoXue.avatar}
        />
      </div>
    </div>
  );
}
