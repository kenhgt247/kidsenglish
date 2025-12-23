
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameState } from './types.ts';

interface ExtendedGameState extends GameState {
  unlockedLevels: number[];
}

interface GameContextType {
  state: ExtendedGameState;
  addScore: (points: number) => void;
  nextLevel: () => void;
  unlockLevel: (levelId: number) => void;
  unlockAllLevels: () => void;
  resetGame: () => void;
  unlockAvatar: (id: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = 'dino_english_progress_v2';

const INITIAL_STATE: ExtendedGameState = {
  score: 0,
  level: 1,
  unlockedAvatars: ['dino-green'],
  currentAvatar: 'dino-green',
  unlockedLevels: [1],
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ExtendedGameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.unlockedLevels) parsed.unlockedLevels = [1];
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved game state", e);
      }
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addScore = (points: number) => {
    setState(prev => ({ ...prev, score: prev.score + points }));
  };

  const nextLevel = () => {
    setState(prev => ({ ...prev, level: prev.level + 1 }));
  };

  const unlockLevel = (levelId: number) => {
    setState(prev => ({
      ...prev,
      unlockedLevels: prev.unlockedLevels.includes(levelId) 
        ? prev.unlockedLevels 
        : [...prev.unlockedLevels, levelId].sort((a,b) => a-b)
    }));
  };

  const unlockAllLevels = () => {
    const all = Array.from({ length: 27 }, (_, i) => i + 1);
    setState(prev => ({ ...prev, unlockedLevels: all }));
  };

  const resetGame = () => {
    if (confirm("Xóa hết tiến trình và chơi lại từ đầu?")) {
      setState(INITIAL_STATE);
      localStorage.removeItem(STORAGE_KEY);
      window.location.hash = "/";
    }
  };

  const unlockAvatar = (id: string) => {
    setState(prev => ({
      ...prev,
      unlockedAvatars: prev.unlockedAvatars.includes(id) 
        ? prev.unlockedAvatars 
        : [...prev.unlockedAvatars, id]
    }));
  };

  return (
    <GameContext.Provider value={{ state, addScore, nextLevel, unlockLevel, unlockAllLevels, resetGame, unlockAvatar }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
