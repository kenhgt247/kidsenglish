
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Star, ChevronRight, MapPin, Trophy, Sparkles, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useGame } from '../GameContext.tsx';
import { Howl } from 'howler';

const jumpSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.3 });

const Decoration = ({ emoji, x, y, delay = 0, size = "text-4xl" }: { emoji: string, x: number, y: number, delay?: number, size?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
    transition={{ 
      delay, 
      opacity: { duration: 0.5 },
      scale: { duration: 0.5 },
      y: { repeat: Infinity, duration: 3 + Math.random() * 2, ease: "easeInOut" }
    }}
    className={`absolute pointer-events-none select-none z-0 ${size}`}
    style={{ left: `${x * 10}px`, top: `${y}%` }}
  >
    {emoji}
  </motion.div>
);

const Map: React.FC = () => {
  const navigate = useNavigate();
  const { state, unlockAllLevels, resetGame } = useGame();
  const [isDinoJumping, setIsDinoJumping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const levels = [
    { id: 1, title: "Dino Snack", route: "/game/feed", x: 8, y: 75, theme: 'jungle', icon: '🍎' },
    { id: 2, title: "Word Jungle", route: "/game/jungle", x: 22, y: 55, theme: 'jungle', icon: '🦁' },
    { id: 3, title: "Alpha Fire", route: "/game/volcano", x: 38, y: 70, theme: 'volcano', icon: '🌋' },
    { id: 4, title: "Bubble Pop", route: "/game/bubbles", x: 55, y: 50, theme: 'ocean', icon: '🫧' },
    { id: 5, title: "Egg Count", route: "/game/eggs", x: 72, y: 65, theme: 'jungle', icon: '🥚' },
    { id: 6, title: "Shape Dunes", route: "/game/desert", x: 90, y: 45, theme: 'desert', icon: '🏜️' },
    { id: 7, title: "Ice Logic", route: "/game/arctic", x: 108, y: 70, theme: 'arctic', icon: '❄️' },
    { id: 8, title: "Fish Verbs", route: "/game/ocean", x: 126, y: 40, theme: 'ocean', icon: '🐬' },
    { id: 9, title: "Star ABC", route: "/game/space", x: 144, y: 65, theme: 'space', icon: '🪐' },
    { id: 10, title: "Farm Joy", route: "/game/farm", x: 162, y: 45, theme: 'farm', icon: '🐮' },
    { id: 11, title: "Rainbow Sky", route: "/game/rainbow", x: 180, y: 70, theme: 'sky', icon: '🌈' },
    { id: 12, title: "Dino Style", route: "/game/dressup", x: 200, y: 50, theme: 'city', icon: '👕' },
    { id: 13, title: "Magic Math", route: "/game/math", x: 218, y: 75, theme: 'space', icon: '➕' },
    { id: 14, title: "Weather", route: "/game/weather", x: 236, y: 55, theme: 'sky', icon: '☀️' },
    { id: 15, title: "Bug Hunter", route: "/game/bugs", x: 254, y: 70, theme: 'jungle', icon: '🐞' },
    { id: 16, title: "Daily Fun", route: "/game/routine", x: 272, y: 50, theme: 'city', icon: '🪥' },
    { id: 17, title: "Plurals", route: "/game/plurals", x: 290, y: 70, theme: 'farm', icon: '🧺' },
    { id: 18, title: "Pet Parlor", route: "/game/parlor", x: 308, y: 50, theme: 'jungle', icon: '🐶' },
    { id: 19, title: "Kitchen Chef", route: "/game/chef", x: 326, y: 75, theme: 'farm', icon: '👨‍🍳' },
    { id: 20, title: "Traffic Hero", route: "/game/traffic", x: 344, y: 55, theme: 'city', icon: '🚦' },
    { id: 21, title: "Size Lab", route: "/game/size", x: 362, y: 70, theme: 'space', icon: '📐' },
    { id: 22, title: "Dino Finale", route: "/game/finale", x: 380, y: 45, theme: 'sky', icon: '⭐' },
  ];

  const unlocked = state.unlockedLevels || [1];
  const maxUnlockedId = Math.max(...unlocked);
  const currentLevel = levels.find(l => l.id === maxUnlockedId) || levels[0];

  useEffect(() => {
    if (scrollRef.current) {
      const dinoX = currentLevel.x * 10;
      scrollRef.current.scrollTo({
        left: dinoX - window.innerWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [maxUnlockedId]);

  const getThemeColor = (theme: string) => {
    switch(theme) {
      case 'jungle': return 'bg-emerald-500';
      case 'volcano': return 'bg-orange-600';
      case 'ocean': return 'bg-sky-500';
      case 'desert': return 'bg-amber-500';
      case 'arctic': return 'bg-blue-300';
      case 'space': return 'bg-indigo-700';
      case 'farm': return 'bg-lime-500';
      case 'sky': return 'bg-rose-400';
      case 'city': return 'bg-slate-700';
      default: return 'bg-slate-500';
    }
  };

  const progressPercent = (unlocked.length / levels.length) * 100;

  const handleDinoClick = () => {
    setIsDinoJumping(true);
    jumpSfx.play();
    setTimeout(() => setIsDinoJumping(false), 500);
  };

  // Generate Path Segments
  const renderPath = () => {
    const segments = [];
    for (let i = 0; i < levels.length - 1; i++) {
      const start = levels[i];
      const end = levels[i + 1];
      const isPathUnlocked = unlocked.includes(end.id);
      
      segments.push(
        <motion.line
          key={`path-${start.id}-${end.id}`}
          x1={start.x * 10}
          y1={`${start.y}%`}
          x2={end.x * 10}
          y2={`${end.y}%`}
          initial={false}
          animate={{
            stroke: isPathUnlocked ? '#10B981' : '#CBD5E1',
            strokeDashoffset: isPathUnlocked ? 0 : 20
          }}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={isPathUnlocked ? "0" : "20 20"}
          className="transition-all duration-1000"
        />
      );
    }
    return segments;
  };

  return (
    <div
      ref={scrollRef}
      className="h-full bg-[#fdfbf7] overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x"
    >
      <div className="relative min-w-[4200px] h-full p-8 md:p-12">
        {/* Background Decorations */}
        <Decoration emoji="🌴" x={5} y={65} delay={0.1} />
        <Decoration emoji="🦖" x={30} y={30} delay={0.5} size="text-8xl opacity-5" />
        <Decoration emoji="🚀" x={140} y={55} delay={1.6} />
        <Decoration emoji="🌈" x={185} y={60} delay={2.2} size="text-7xl" />
        <Decoration emoji="🌋" x={45} y={20} delay={0.8} size="text-9xl opacity-10" />

        {/* Header Overlay */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-2xl flex gap-3 items-center bg-white/90 backdrop-blur-xl p-3 rounded-[2rem] border-2 border-slate-100 shadow-2xl">
          <div className="p-2 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-200">
            <MapPin size={24} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
             <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                <span>World Explorer</span>
                <span>{unlocked.length} / {levels.length}</span>
             </div>
             <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }} 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-inner" 
                />
             </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-400 text-white px-4 py-2 rounded-2xl font-black text-lg shadow-lg shadow-yellow-100">
             <Trophy size={20} fill="currentColor" />
             <span>{state.score}</span>
          </div>
          <div className="flex gap-2 ml-1">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => { if(confirm("Unlock all 22 levels for testing?")) unlockAllLevels(); }}
              className="p-3 bg-indigo-50 rounded-2xl text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
              title="Unlock All"
            >
              <Sparkles size={20} />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={resetGame}
              className="p-3 bg-rose-50 rounded-2xl text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
              title="Reset Progress"
            >
              <RotateCcw size={20} />
            </motion.button>
          </div>
        </div>

        {/* Path SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 4200 100" preserveAspectRatio="none">
          {renderPath()}
        </svg>

        {/* Mascot Dino */}
        <motion.div
          onClick={handleDinoClick}
          animate={{ 
            left: `${currentLevel.x * 10}px`, 
            top: `${currentLevel.y}%`, 
            y: isDinoJumping ? -140 : -100, 
            scale: isDinoJumping ? 1.4 : 1.2,
            rotate: isDinoJumping ? [0, 10, -10, 0] : 0
          }}
          transition={{ 
            type: "spring", 
            stiffness: 120, 
            damping: 12 
          }}
          className="absolute -translate-x-1/2 z-[60] cursor-pointer"
        >
          <motion.div 
            animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }} 
            transition={{ repeat: Infinity, duration: 2 }} 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-24 h-8 bg-black/20 blur-2xl rounded-full" 
          />
          <div className="text-7xl md:text-[9rem] drop-shadow-[0_20px_20px_rgba(0,0,0,0.2)]">🦖</div>
        </motion.div>

        {levels.map((level) => {
          const isUnlocked = unlocked.includes(level.id);
          const isCompleted = unlocked.includes(level.id + 1);
          const isCurrentTarget = level.id === maxUnlockedId;
          
          return (
            <motion.div 
              key={level.id} 
              style={{ left: `${level.x * 10}px`, top: `${level.y}%` }} 
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="relative flex flex-col items-center group">
                {/* Visual Feedback for Current Target */}
                <AnimatePresence>
                  {isCurrentTarget && !isCompleted && level.id < 22 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-24 bg-white px-6 py-2 rounded-2xl shadow-2xl border-2 border-emerald-500 text-emerald-600 font-black text-sm uppercase z-20 whitespace-nowrap"
                    >
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }} 
                        transition={{ repeat: Infinity }}
                        className="flex items-center gap-2"
                      >
                        Play Now! {level.icon}
                      </motion.div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-emerald-500 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Level Node Button */}
                <motion.button
                  onClick={() => isUnlocked && navigate(level.route)}
                  whileHover={isUnlocked ? { scale: 1.1, y: -5 } : {}}
                  whileTap={isUnlocked ? { scale: 0.95 } : {}}
                  className={`
                    w-20 h-20 md:w-32 md:h-32 rounded-3xl md:rounded-[3.5rem] shadow-2xl flex items-center justify-center border-4 border-white transition-all overflow-hidden relative
                    ${isUnlocked ? `${getThemeColor(level.theme)} text-white` : 'bg-slate-200 text-slate-400 grayscale'}
                    ${isCurrentTarget && !isCompleted ? 'ring-8 ring-emerald-500/20 ring-offset-4 ring-offset-transparent' : ''}
                    ${isCompleted ? 'opacity-90' : 'opacity-100'}
                  `}
                >
                  {/* Status Overlays */}
                  {!isUnlocked ? (
                    <Lock size={28} className="opacity-50" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-3xl md:text-6xl font-black leading-none">{level.id}</span>
                      <span className="text-lg md:text-3xl mt-1 drop-shadow-md">{level.icon}</span>
                      
                      {isCompleted && (
                        <div className="absolute top-2 right-2 text-white drop-shadow-lg">
                          <CheckCircle2 size={20} fill="rgba(255,255,255,0.3)" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Subtle Texture Overlay */}
                  <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                </motion.button>

                {/* Level Title Label */}
                <div className={`
                  mt-6 flex flex-col items-center transition-all duration-300
                  ${isUnlocked ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}
                `}>
                  <h3 className={`
                    font-black text-xs md:text-sm uppercase px-4 py-1.5 rounded-full shadow-sm border border-slate-100
                    ${isUnlocked ? 'text-slate-800 bg-white' : 'text-slate-400 bg-slate-50'}
                    ${isCurrentTarget ? 'ring-2 ring-emerald-500/30' : ''}
                  `}>
                    {level.title}
                  </h3>
                  
                  {isUnlocked && (
                    <div className="flex gap-0.5 mt-1.5">
                       <Star size={10} className="text-yellow-400 fill-yellow-400" />
                       <Star size={10} className="text-yellow-400 fill-yellow-400" />
                       <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Scroll Hint */}
      <AnimatePresence>
        {maxUnlockedId < 5 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-10 right-10 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-slate-100 flex items-center gap-3 text-slate-500 font-black z-[110]"
          >
            Scroll to explore <ChevronRight size={20} className="animate-bounce-x" />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Map;
