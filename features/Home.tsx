
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Sparkles, Star, Award, BookOpen, X, Volume2, MousePointer2, Trophy } from 'lucide-react';

const InstructionStep = ({ icon: Icon, title, text, color }: { icon: any, title: string, text: string, color: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-sm border-2 border-slate-50">
    <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
      <Icon size={24} />
    </div>
    <div>
      <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{title}</h3>
      <p className="text-slate-500 font-bold text-sm leading-snug">{text}</p>
    </div>
  </div>
);

const Home: React.FC = () => {
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-100 via-white to-emerald-50 px-6 overflow-hidden relative">
      
      {/* Background Decorative Elements */}
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute -top-20 -left-20 text-[20rem] opacity-[0.03] pointer-events-none italic font-black">ABC</motion.div>
      <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute top-1/4 right-10 text-6xl opacity-20">☁️</motion.div>

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10 }}
        className="w-56 h-56 md:w-72 md:h-72 bg-dino-green rounded-[4rem] flex items-center justify-center shadow-2xl mb-12 border-[12px] border-white relative"
      >
        <span className="text-9xl md:text-[10rem] select-none">🦖</span>
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-6 -right-6 bg-yellow-400 p-4 rounded-full border-4 border-white shadow-xl"
        >
          <Star className="text-white fill-white" size={32} />
        </motion.div>
      </motion.div>

      <div className="text-center z-10 max-w-lg">
        <h1 className="text-6xl md:text-8xl font-black text-slate-800 mb-6 tracking-tighter leading-none">
          Asking <br/><span className="text-dino-green drop-shadow-sm">ENGLISH</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 mb-12 font-bold leading-relaxed px-4">
          Journey through 10 magical worlds and learn English with your best dino friend!
        </p>

        <div className="flex flex-col gap-4 items-center">
          <Link to="/map">
            <motion.button
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="group bg-game-orange text-white text-3xl font-black px-16 py-8 rounded-[3rem] shadow-[0_15px_0_0_#EA580C] hover:shadow-[0_8px_0_0_#EA580C] transition-all flex items-center gap-4 active:translate-y-2"
            >
              <Play fill="currentColor" size={36} />
              LET'S PLAY!
            </motion.button>
          </Link>

          <motion.button
            onClick={() => setShowHowTo(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-sm hover:text-dino-green transition-colors py-2"
          >
            <BookOpen size={20} />
            HOW TO PLAY
          </motion.button>
        </div>
      </div>

      <div className="mt-16 flex gap-8 items-center bg-white/50 backdrop-blur-sm px-8 py-4 rounded-3xl border-2 border-white/50 shadow-sm">
        <div className="flex flex-col items-center">
          <Sparkles className="text-yellow-500 mb-1" size={24} />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Educational</span>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="flex flex-col items-center">
          <Award className="text-dino-green mb-1" size={24} />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Kid-Safe</span>
        </div>
      </div>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden relative border-8 border-white"
            >
              <button 
                onClick={() => setShowHowTo(false)}
                className="absolute top-6 right-6 p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="p-8 pt-12">
                <div className="text-center mb-10">
                  <div className="inline-block p-4 bg-sky-100 rounded-3xl text-sky-600 mb-4">
                    <BookOpen size={48} />
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight">How to Play</h2>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">Adventure Awaits!</p>
                </div>

                <div className="space-y-4">
                  <InstructionStep 
                    icon={Volume2}
                    color="bg-sky-500"
                    title="1. Listen Closely"
                    text="Asking will speak and tell you what he needs or what to find."
                  />
                  <InstructionStep 
                    icon={MousePointer2}
                    color="bg-orange-500"
                    title="2. Touch & Drag"
                    text="Use your finger to tap, pop bubbles, or drag food to Asking's mouth."
                  />
                  <InstructionStep 
                    icon={Trophy}
                    color="bg-yellow-500"
                    title="3. Win Stars"
                    text="Get points for correct answers and unlock new magical worlds on the map!"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowHowTo(false)}
                  className="w-full mt-10 bg-dino-green text-white text-2xl font-black py-6 rounded-3xl shadow-[0_8px_0_0_#22C55E] active:translate-y-1 active:shadow-none transition-all uppercase"
                >
                  GOT IT!
                </motion.button>
              </div>

              {/* Decorative side color bars */}
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-dino-green via-yellow-400 to-game-orange" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
