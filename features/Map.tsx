
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, MapPin, Trophy, Sparkles, RotateCcw, Play } from 'lucide-react';
import { useGame } from '../GameContext.tsx';
import { Howl } from 'howler';

const Decoration = ({ emoji, x, y, delay = 0, size = "text-3xl md:text-4xl" }: { emoji: string, x: number, y: number, delay?: number, size?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
    transition={{ delay, y: { repeat: Infinity, duration: 3 + Math.random() * 2, ease: "easeInOut" } }}
    className={`absolute pointer-events-none select-none z-0 ${size}`}
    style={{ left: `${x * 8}px`, top: `${y}%` }}
  >
    {emoji}
  </motion.div>
);

const Map: React.FC = () => {
  const navigate = useNavigate();
  const { state, unlockAllLevels, resetGame } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacing = 9.5; 
  
  const levels = [
    { id: 1, title: "Dino Snack", route: "/game/feed", x: 8, y: 70, theme: 'jungle', icon: '🍎' },
    { id: 2, title: "Word Jungle", route: "/game/jungle", x: 22, y: 50, theme: 'jungle', icon: '🦁' },
    { id: 3, title: "Alpha Fire", route: "/game/volcano", x: 38, y: 75, theme: 'volcano', icon: '🌋' },
    { id: 4, title: "Bubble Pop", route: "/game/bubbles", x: 55, y: 55, theme: 'ocean', icon: '🫧' },
    { id: 5, title: "Egg Count", route: "/game/eggs", x: 72, y: 65, theme: 'jungle', icon: '🥚' },
    { id: 6, title: "Shape Dunes", route: "/game/desert", x: 90, y: 45, theme: 'desert', icon: '🏜️' },
    { id: 7, title: "Ice Logic", route: "/game/arctic", x: 108, y: 70, theme: 'arctic', icon: '❄️' },
    { id: 8, title: "Fish Verbs", route: "/game/ocean", x: 126, y: 40, theme: 'ocean', icon: '🐬' },
    { id: 9, title: "Star ABC", route: "/game/space", x: 144, y: 65, theme: 'space', icon: '🪐' },
    { id: 10, title: "Farm Joy", route: "/game/farm", x: 162, y: 45, theme: 'farm', icon: '🐮' },
    { id: 11, title: "Rainbow Sky", route: "/game/rainbow", x: 180, y: 70, theme: 'sky', icon: '🌈' },
    { id: 12, title: "Dino Style", route: "/game/dressup", x: 198, y: 50, theme: 'city', icon: '👕' },
    { id: 13, title: "Magic Math", route: "/game/math", x: 216, y: 75, theme: 'space', icon: '➕' },
    { id: 14, title: "Weather", route: "/game/weather", x: 234, y: 55, theme: 'sky', icon: '☀️' },
    { id: 15, title: "Bug Hunter", route: "/game/bugs", x: 252, y: 70, theme: 'jungle', icon: '🐞' },
    { id: 16, title: "Daily Fun", route: "/game/routine", x: 270, y: 50, theme: 'city', icon: '🪥' },
    { id: 17, title: "Plurals", route: "/game/plurals", x: 288, y: 70, theme: 'farm', icon: '🧺' },
    { id: 18, title: "Pet Parlor", route: "/game/parlor", x: 306, y: 50, theme: 'jungle', icon: '🐶' },
    { id: 19, title: "Kitchen Chef", route: "/game/chef", x: 324, y: 75, theme: 'farm', icon: '👨‍🍳' },
    { id: 20, title: "Traffic Hero", route: "/game/traffic", x: 342, y: 55, theme: 'city', icon: '🚦' },
    { id: 21, title: "Size Lab", route: "/game/size", x: 360, y: 70, theme: 'space', icon: '📐' },
    { id: 22, title: "Sound Studio", route: "/game/music", x: 378, y: 45, theme: 'city', icon: '🎸' },
    { id: 23, title: "Dino Match", route: "/game/memory", x: 396, y: 65, theme: 'jungle', icon: '🧠' },
    { id: 24, title: "Body Map", route: "/game/body", x: 414, y: 45, theme: 'farm', icon: '🦵' },
    { id: 25, title: "Verb Run", route: "/game/verbs", x: 432, y: 70, theme: 'jungle', icon: '🏃' },
    { id: 26, title: "Color Lab", route: "/game/colorlab", x: 450, y: 50, theme: 'space', icon: '🧪' },
    { id: 27, title: "Dino Finale", route: "/game/finale", x: 468, y: 65, theme: 'sky', icon: '⭐' },
  ];

  const unlocked = state.unlockedLevels || [1];
  const maxUnlockedId = Math.max(...unlocked);
  const currentLevel = levels.find(l => l.id === maxUnlockedId) || levels[0];

  useEffect(() => {
    if (scrollRef.current) {
      const dinoX = currentLevel.x * spacing;
      scrollRef.current.scrollTo({
        left: dinoX - window.innerWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [maxUnlockedId]);

  const getThemeColor = (theme: string) => {
    switch(theme) {
      case 'jungle': return 'bg-emerald-500 shadow-[0_10px_0_0_#059669]';
      case 'volcano': return 'bg-orange-600 shadow-[0_10px_0_0_#9A3412]';
      case 'ocean': return 'bg-sky-500 shadow-[0_10px_0_0_#0284C7]';
      case 'desert': return 'bg-amber-500 shadow-[0_10px_0_0_#B45309]';
      case 'arctic': return 'bg-blue-300 shadow-[0_10px_0_0_#2563EB]';
      case 'space': return 'bg-indigo-700 shadow-[0_10px_0_0_#4338CA]';
      case 'farm': return 'bg-lime-500 shadow-[0_10px_0_0_#4D7C0F]';
      case 'sky': return 'bg-rose-400 shadow-[0_10px_0_0_#BE123C]';
      case 'city': return 'bg-slate-700 shadow-[0_10px_0_0_#334155]';
      default: return 'bg-slate-500 shadow-[0_10px_0_0_#1E293B]';
    }
  };

  return (
    <div ref={scrollRef} className="h-full bg-[#fdfbf7] overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x">
      <div className="relative min-w-[4600px] h-full p-4 md:p-8">
        <div className="fixed top-0 left-0 right-0 z-[150] p-4 md:p-6 pointer-events-none">
          <div className="max-w-4xl mx-auto flex gap-3 md:gap-4 items-center bg-white/90 backdrop-blur-xl p-3 md:p-4 rounded-3xl md:rounded-[2rem] border-2 md:border-4 border-slate-100 shadow-xl pointer-events-auto">
            <div className="p-2 md:p-3 bg-emerald-500 rounded-xl md:rounded-2xl text-white shadow-lg"><MapPin size={20} /></div>
            <div className="flex-1"><div className="h-3 md:h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200"><motion.div initial={{ width: 0 }} animate={{ width: `${(unlocked.length / levels.length) * 100}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" /></div></div>
            <div className="flex items-center gap-1.5 md:gap-2 bg-yellow-400 text-white px-3 py-1.5 md:px-5 md:py-2 rounded-xl md:rounded-2xl font-black text-lg md:text-xl shadow-md"><Trophy size={16} fill="currentColor" /><span>{state.score}</span></div>
            <button onClick={unlockAllLevels} className="p-2 md:p-3 bg-indigo-100 text-indigo-500 rounded-xl md:rounded-2xl active:bg-indigo-500 active:text-white transition-colors"><Sparkles size={20} /></button>
            <button onClick={resetGame} className="p-2 md:p-3 bg-rose-100 text-rose-500 rounded-xl md:rounded-2xl active:bg-rose-500 active:text-white transition-colors"><RotateCcw size={20} /></button>
          </div>
        </div>

        <motion.div
          animate={{ left: `${currentLevel.x * spacing}px`, top: `${currentLevel.y}%`, y: -100, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="absolute -translate-x-1/2 z-[50] pointer-events-none drop-shadow-2xl"
        >
          <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-[8rem] md:text-[14rem] select-none">🦖</motion.div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/10 blur-xl rounded-full" />
        </motion.div>

        {levels.map((level) => {
          const isUnlocked = unlocked.includes(level.id);
          const isCurrent = level.id === maxUnlockedId;
          return (
            <div key={level.id} style={{ left: `${level.x * spacing}px`, top: `${level.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="flex flex-col items-center">
                <motion.button
                  onClick={() => isUnlocked && navigate(level.route)}
                  whileHover={isUnlocked ? { scale: 1.05, y: -4 } : {}}
                  whileTap={isUnlocked ? { scale: 0.95, y: 4 } : {}}
                  className={`w-24 h-24 sm:w-28 sm:h-28 md:w-44 md:h-44 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center border-4 md:border-8 border-white transition-all relative ${isUnlocked ? getThemeColor(level.theme) : 'bg-slate-200 text-slate-400 grayscale shadow-none border-slate-300'}`}
                >
                  {!isUnlocked ? <Lock size={28} /> : (
                    <>
                      <span className="text-3xl md:text-6xl font-black mb-0.5">{level.id}</span>
                      <span className="text-2xl md:text-4xl">{level.icon}</span>
                      {isCurrent && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-[1.8rem] md:rounded-[2.5rem] animate-pulse">
                          <div className="bg-orange-500 p-2 md:p-4 rounded-full shadow-2xl border-2 md:border-4 border-white">
                            <Play fill="white" className="text-white ml-0.5 w-6 h-6 md:w-10 md:h-10" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.button>
                <div className={`mt-4 font-black text-xs md:text-lg uppercase px-4 py-1.5 md:px-6 md:py-2 rounded-full bg-white shadow-lg border-2 ${isUnlocked ? 'text-slate-800 border-emerald-50' : 'text-slate-300 border-slate-50'}`}>
                  {level.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Map;
