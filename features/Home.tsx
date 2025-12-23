import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles, Star, Award, AlertCircle } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [hasKey, setHasKey] = useState(true);

  const checkKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (e) {
        setHasKey(false);
      }
    }
  };

  useEffect(() => {
    checkKey();
    const interval = setInterval(checkKey, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected && window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      }
    }
    navigate('/map');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-300 to-sky-100 relative overflow-hidden px-6 safe-pb safe-pt">
      
      {/* Background Decor */}
      <motion.div animate={{ x: [-100, 100] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-20 left-0 text-7xl opacity-20 pointer-events-none">☁️</motion.div>
      <motion.div animate={{ x: [200, -200] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute top-40 right-0 text-6xl opacity-15 pointer-events-none">☁️</motion.div>
      
      <div className="flex flex-col items-center z-10 w-full max-w-sm">
        {/* Dino Character */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }} 
          animate={{ scale: 1, rotate: 0 }}
          className="w-48 h-48 md:w-64 md:h-64 bg-emerald-400 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center shadow-2xl mb-6 border-[10px] border-white relative"
        >
          <span className="text-[7rem] md:text-[9rem] select-none">🦖</span>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute -top-4 -right-4 text-5xl"
          >
            🌟
          </motion.div>
        </motion.div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black text-slate-800 leading-none tracking-tighter">
            Dino <span className="text-emerald-500">ENGLISH</span>
          </h1>
          <p className="text-slate-600 font-bold mt-2 text-lg md:text-xl">Learn English with Asking!</p>
        </div>

        {/* Play Button */}
        <div className="relative w-full">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-orange-400 rounded-full blur-xl"
          />
          <motion.button
            onClick={handlePlayClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-full bg-gradient-to-r from-orange-400 to-orange-600 text-white text-3xl font-black py-6 rounded-full shadow-[0_8px_0_0_#C2410C] flex items-center justify-center gap-4 active:translate-y-1 active:shadow-none transition-all"
          >
            <Play fill="currentColor" size={32} />
            PLAY!
          </motion.button>
        </div>
      </div>

      {/* Floating Key Warning */}
      <AnimatePresence>
        {!hasKey && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 mx-6 bg-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-rose-200 z-[100]"
          >
            <AlertCircle size={24} className="text-rose-500 flex-shrink-0" />
            <button 
              onClick={() => window.aistudio?.openSelectKey?.()}
              className="text-rose-500 font-bold text-sm text-left"
            >
              Please activate your API Key to hear Dino talk! 🦖
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 flex gap-6 opacity-20 pointer-events-none">
        <Star size={32} className="text-yellow-400" />
        <Award size={32} className="text-emerald-500" />
        <Sparkles size={32} className="text-sky-400" />
      </div>
    </div>
  );
};

export default Home;