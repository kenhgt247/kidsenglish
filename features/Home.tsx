
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles, Star, Award, Key, AlertCircle } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Nếu chưa chọn Key, mở hộp thoại chọn Key trước
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        await window.aistudio.openSelectKey?.();
        // Sau khi mở, cứ để họ vào Map, Key sẽ được cập nhật sau
        setHasKey(true);
      }
    }
    navigate('/map');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-sky-50 relative overflow-hidden">
      
      {!hasKey && (
        <motion.div 
          initial={{ y: -50 }} animate={{ y: 20 }}
          className="absolute top-0 bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[2000] border-4 border-white font-black text-xs"
        >
          <AlertCircle size={20} />
          <span>PLEASE SELECT AN API KEY TO START!</span>
        </motion.div>
      )}

      <div className="flex flex-col items-center z-10 relative">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-48 h-48 md:w-64 md:h-64 bg-emerald-400 rounded-[3rem] flex items-center justify-center shadow-2xl mb-8 border-8 border-white relative"
        >
          <span className="text-8xl md:text-[9rem] select-none pointer-events-none">🦖</span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-black text-slate-800 mb-4 tracking-tighter pointer-events-none">
          Asking <span className="text-emerald-500">ENGLISH</span>
        </h1>
        
        <p className="text-slate-500 font-bold mb-10 text-center px-6 pointer-events-none">Start your fun English adventure!</p>

        <motion.button
          onClick={handlePlayClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-orange-500 text-white text-3xl font-black px-16 py-8 rounded-[2.5rem] shadow-[0_12px_0_0_#C2410C] flex items-center gap-4 active:translate-y-2 transition-all relative z-[50]"
        >
          <Play fill="currentColor" size={36} />
          LET'S PLAY!
        </motion.button>
      </div>

      <div className="absolute bottom-10 flex gap-6 opacity-30 pointer-events-none">
        <Star className="text-yellow-400" size={32} />
        <Award className="text-emerald-500" size={32} />
        <Sparkles className="text-sky-400" size={32} />
      </div>
    </div>
  );
};

export default Home;
