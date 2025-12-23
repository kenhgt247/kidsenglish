import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles, Star, Award, Key, AlertCircle } from 'lucide-react';

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
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
          setHasKey(true);
        }
      }
    }
    navigate('/map');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-300 to-sky-100 relative overflow-hidden px-4">
      
      {/* Background elements */}
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-10 left-4 md:top-20 md:left-10 text-6xl md:text-8xl opacity-40 select-none"
      >☁️</motion.div>
      <motion.div 
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        className="absolute top-20 right-4 md:top-40 md:right-20 text-5xl md:text-7xl opacity-40 select-none"
      >☁️</motion.div>
      
      <div className="flex flex-col items-center z-10 relative w-full max-w-lg">
        <motion.div
          initial={{ scale: 0, rotate: -15 }} 
          animate={{ scale: 1, rotate: 0 }}
          className="w-40 h-40 sm:w-56 sm:h-56 md:w-80 md:h-80 bg-emerald-400 rounded-[2.5rem] md:rounded-[4rem] flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.3)] mb-8 md:mb-12 border-[8px] md:border-[12px] border-white relative"
        >
          <span className="text-7xl sm:text-8xl md:text-[12rem] select-none">🦖</span>
          <motion.div 
            animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute -top-4 -right-4 md:-top-6 md:-right-6 text-4xl md:text-6xl"
          >
            🌟
          </motion.div>
        </motion.div>

        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-slate-800 mb-2 tracking-tighter text-center drop-shadow-sm">
          Asking <span className="text-emerald-500">ENGLISH</span>
        </h1>
        
        <p className="text-slate-600 font-bold mb-8 md:mb-12 text-center px-4 text-lg md:text-2xl">Vui học tiếng Anh cùng Khủng Long nhỏ!</p>

        {/* NÚT PLAY CHÍNH GIỮA CỰC LỚN */}
        <div className="relative group w-full flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-orange-400 rounded-full blur-2xl max-w-[280px] mx-auto"
          />
          <motion.button
            onClick={handlePlayClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative bg-gradient-to-r from-orange-400 to-orange-600 text-white text-3xl sm:text-4xl md:text-6xl font-black px-12 py-6 sm:px-16 sm:py-8 md:px-20 md:py-10 rounded-full shadow-[0_10px_0_0_#C2410C] flex items-center gap-4 sm:gap-6 active:translate-y-1 active:shadow-none transition-all w-fit"
          >
            <Play fill="currentColor" size={48} className="md:w-16 md:h-16 group-hover:rotate-12 transition-transform" />
            CHƠI!
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {!hasKey && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: -20, md: -40, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-4 bg-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[50] border-2 md:border-4 border-rose-400"
          >
            <AlertCircle size={24} className="text-rose-500" />
            <button 
              onClick={() => window.aistudio?.openSelectKey?.()}
              className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-rose-600 transition-colors text-sm md:text-base"
            >
              KÍCH HOẠT MICRO 🦖
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 flex gap-8 md:gap-12 opacity-30 pointer-events-none">
        <Star className="text-yellow-400 w-8 h-8 md:w-12 md:h-12" />
        <Award className="text-emerald-500 w-8 h-8 md:w-12 md:h-12" />
        <Sparkles className="text-sky-400 w-8 h-8 md:w-12 md:h-12" />
      </div>
    </div>
  );
};

export default Home;