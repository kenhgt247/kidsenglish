
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Heart, Star } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const DinoFinale: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const speak = async () => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Congratulations! You have finished the Dino English Adventure! You are a superstar! Your score is ${state.score}.` }] }],
        config: { responseModalities: [Modality.AUDIO] }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         const ctx = audioContextRef.current || new AudioContext({ sampleRate: 24000 });
         audioContextRef.current = ctx;
         const binary = atob(base64);
         const bytes = new Uint8Array(binary.length);
         for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
         const dataInt16 = new Int16Array(bytes.buffer);
         const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
         const channelData = buffer.getChannelData(0);
         for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
         const source = ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(ctx.destination);
         source.onended = () => setIsSpeaking(false);
         source.start();
      } else { setIsSpeaking(false); }
    } catch { setIsSpeaking(false); }
  };

  useEffect(() => { 
    setIsVictory(true);
    speak(); 
  }, []);

  return (
    <div className="h-full bg-gradient-to-b from-sky-400 to-indigo-600 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Confetti active={isVictory} />
      
      <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10 w-full max-w-4xl text-center">
        <motion.div 
          animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 4 }}
          className="text-[15rem] md:text-[20rem] drop-shadow-2xl"
        >
          🦖
        </motion.div>
        
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[4rem] shadow-2xl border-8 border-white flex flex-col items-center gap-6">
           <h1 className="text-5xl md:text-8xl font-black text-indigo-900 leading-none">THE END</h1>
           <p className="text-xl md:text-3xl text-slate-500 font-bold uppercase tracking-widest">Adventure Completed!</p>
           
           <div className="flex items-center gap-3 bg-yellow-400 text-white px-8 py-4 rounded-3xl text-3xl font-black shadow-xl">
              <Star fill="currentColor" size={40} />
              <span>{state.score}</span>
           </div>

           <button 
             onClick={() => navigate('/')}
             className="w-full bg-indigo-600 text-white text-3xl font-black py-8 rounded-[2.5rem] shadow-[0_12px_0_0_#3730A3] hover:translate-y-1 transition-all uppercase"
           >
              PLAY AGAIN!
           </button>
        </div>
      </div>

      {/* Decorative Hearts */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [-20, -1000], 
            x: Math.sin(i) * 100, 
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0]
          }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 text-red-400 text-4xl pointer-events-none"
          style={{ left: `${10 * i}%` }}
        >
          <Heart fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};

export default DinoFinale;
