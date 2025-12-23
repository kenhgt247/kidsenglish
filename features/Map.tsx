import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, MapPin, Trophy, Sparkles, RotateCcw, Play } from 'lucide-react';
import { useGame } from '../GameContext.tsx';

const Map: React.FC = () => {
  const navigate = useNavigate();
  const { state, unlockAllLevels, resetGame } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Mobile spacing adjustments
  const spacing = window.innerWidth < 768 ? 120 : 180; 
  
  const levels = [
    { id: 1, title: "Dino Snack", route: "/game/feed", x: 1, y: 70, theme: 'jungle', icon: '🍎' },
    { id: 2, title: "Word Jungle", route: "/game/jungle", x: 2.5, y: 40, theme: 'jungle', icon: '🦁' },
    { id: 3, title: "Alpha Fire", route: "/game/volcano", x: 4, y: 75, theme: 'volcano', icon: '🌋' },
    { id: 4, title: "Bubble Pop", route: "/game/bubbles", x: 5.5, y: 35, theme: 'ocean', icon: '🫧' },
    { id: 5, title: "Egg Count", route: "/game/eggs", x: 7, y: 65, theme: 'jungle', icon: '🥚' },
    { id: 6, title: "Shape Dunes", route: "/game/desert", x: 8.5, y: 30, theme: 'desert', icon: '🏜️' },
    { id: 7, title: "Ice Logic", route: "/game/arctic", x: 10, y: 70, theme: 'arctic', icon: '❄️' },
    { id: 8, title: "Fish Verbs", route: "/game/ocean", x: 11.5, y: 35, theme: 'ocean', icon: '🐬' },
    { id: 9, title: "Star ABC", route: "/game/space", x: 13, y: 65, theme: 'space', icon: '🪐' },
    { id: 10, title: "Farm Joy", route: "/game/farm", x: 14.5, y: 40, theme: 'farm', icon: '🐮' },
    { id: 11, title: "Rainbow Sky", route: "/game/rainbow", x: 16, y: 70, theme: 'sky', icon: '🌈' },
    { id: 12, title: "Dino Style", route: "/game/dressup", x: 17.5, y: 45, theme: 'city', icon: '👕' },
    { id: 13, title: "Magic Math", route: "/game/math", x: 19, y: 75, theme: 'space', icon: '➕' },
    { id: 14, title: "Weather", route: "/game/weather", x: 20.5, y: 35, theme: 'sky', icon: '☀️' },
    { id: 15, title: "Bug Hunter", route: "/game/bugs", x: 22, y: 70, theme: 'jungle', icon: '🐞' },
    { id: 16, title: "Daily Fun", route: "/game/routine", x: 23.5, y: 40, theme: 'city', icon: '🪥' },
    { id: 17, title: "Plurals", route: "/game/plurals", x: 25, y: 70, theme: 'farm', icon: '🧺' },
    { id: 18, title: "Pet Parlor", route: "/game/parlor", x: 26.5, y: 35, theme: 'jungle', icon: '🐶' },
    { id: 19, title: "Kitchen Chef", route: "/game/chef", x: 28, y: 75, theme: 'farm', icon: '👨‍🍳' },
    { id: 20, title: "Traffic Hero", route: "/game/traffic", x: 29.5, y: 35, theme: 'city', icon: '🚦' },
    { id: 21, title: "Size Lab", route: "/game/size", x: 31, y: 70, theme: 'space', icon: '📐' },
    { id: 22, title: "Sound Studio", route: "/game/music", x: 32.5, y: 40, theme: 'city', icon: '🎸' },
    { id: 23, title: "Dino Match", route: "/game/memory", x: 34, y: 65, theme: 'jungle', icon: '🧠' },
    { id: 24, title: "Body Map", route: "/game/body", x: 35.5, y: 35, theme: 'farm', icon: '🦵' },
    { id: 25, title: "Verb Run", route: "/game/verbs", x: 37, y: 70, theme: 'jungle', icon: '🏃' },
    { id: 26, title: "Color Lab", route: "/game/colorlab", x: 38.5, y: 40, theme: 'space', icon: '🧪' },
    { id: 27, title: "Dino Finale", route: "/game/finale", x: 40, y: 60, theme: 'sky', icon: '⭐' },
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
  }, [maxUnlockedId, spacing]);

  const getThemeColor = (theme: string) => {
    switch(theme) {
      case 'jungle': return 'bg-emerald-500 shadow-[0_6px_0_0_#059669]';
      case 'volcano': return 'bg-orange-600 shadow-[0_6px_0_0_#9A3412]';
      case 'ocean': return 'bg-sky-500 shadow-[0_6px_0_0_#0284C7]';
      case 'desert': return 'bg-amber-500 shadow-[0_6px_0_0_#B45309]';
      case 'arctic': return 'bg-blue-300 shadow-[0_6px_0_0_#2563EB]';
      case 'space': return 'bg-indigo-700 shadow-[0_6px_0_0_#4338CA]';
      case 'farm': return 'bg-lime-500 shadow-[0_6px_0_0_#4D7C0F]';
      case 'sky': return 'bg-rose-400 shadow-[0_6px_0_0_#BE123C]';
      case 'city': return 'bg-slate-700 shadow-[0_6px_0_0_#334155]';
      default: return 'bg-slate-500 shadow-[0_6px_0_0_#1E293B]';
    }
  };

  return (
    <div className="h-full w-full bg-[#fdfbf7] flex flex-col overflow-hidden">
      {/* HUD Bar */}
      <div className="z-[150] p-3 md:p-6 safe-pt">
        <div className="max-w-4xl mx-auto flex gap-3 items-center bg-white/95 backdrop-blur-xl p-3 rounded-2xl border-2 border-slate-100 shadow-xl">
          <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg"><MapPin size={20} /></div>
          <div className="flex-1">
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(unlocked.length / levels.length) * 100}%` }} className="h-full bg-emerald-500" />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-400 text-white px-3 py-1 rounded-xl font-bold text-lg shadow-md">
            <Trophy size={16} fill="currentColor" />
            <span>{state.score}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={unlockAllLevels} className="p-2 bg-indigo-100 text-indigo-500 rounded-xl active:bg-indigo-500 active:text-white"><Sparkles size={20} /></button>
            <button onClick={resetGame} className="p-2 bg-rose-100 text-rose-500 rounded-xl active:bg-rose-500 active:text-white"><RotateCcw size={20} /></button>
          </div>
        </div>
      </div>

      {/* Map Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x select-none">
        <div className="relative min-w-[5000px] h-full">
          {/* Decorative Background Line */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10" viewBox={`0 0 5000 100`} preserveAspectRatio="none">
            <path d="M0,50 Q2500,0 5000,50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10,10" className="text-emerald-500" />
          </svg>

          {/* Dino Marker */}
          <motion.div
            animate={{ left: `${currentLevel.x * spacing}px`, top: `${currentLevel.y}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            className="absolute -translate-x-1/2 -translate-y-[80%] z-[50] pointer-events-none drop-shadow-2xl"
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-7xl md:text-9xl">
              🦖
            </motion.div>
            <div className="w-16 h-4 bg-black/10 blur-md rounded-full mx-auto" />
          </motion.div>

          {levels.map((level) => {
            const isUnlocked = unlocked.includes(level.id);
            const isCurrent = level.id === maxUnlockedId;
            return (
              <div key={level.id} style={{ left: `${level.x * spacing}px`, top: `${level.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="flex flex-col items-center">
                  <motion.button
                    onClick={() => isUnlocked && navigate(level.route)}
                    whileHover={isUnlocked ? { scale: 1.05 } : {}}
                    whileTap={isUnlocked ? { scale: 0.9 } : {}}
                    className={`w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[2.5rem] flex flex-col items-center justify-center border-4 border-white transition-all relative ${isUnlocked ? getThemeColor(level.theme) : 'bg-slate-200 text-slate-400 grayscale border-slate-300 shadow-none'}`}
                  >
                    {!isUnlocked ? <Lock size={20} /> : (
                      <>
                        <span className="text-xl md:text-3xl font-black mb-0.5">{level.id}</span>
                        <span className="text-xl md:text-3xl">{level.icon}</span>
                        {isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl md:rounded-[2rem] bg-black/5 animate-pulse">
                            <div className="bg-orange-500 p-1.5 rounded-full border-2 border-white">
                              <Play fill="white" className="text-white w-4 h-4 md:w-6 md:h-6" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.button>
                  <div className={`mt-2 font-bold text-[10px] md:text-sm uppercase px-3 py-1 rounded-full bg-white shadow-md border ${isUnlocked ? 'text-slate-800 border-slate-100' : 'text-slate-300 border-slate-50'}`}>
                    {level.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Map;