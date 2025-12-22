
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const correctSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.5 });

const FRUITS = [
  { id: 'apple', icon: '🍎', label: 'APPLE' },
  { id: 'banana', icon: '🍌', label: 'BANANA' },
  { id: 'orange', icon: '🍊', label: 'ORANGE' },
];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
  const frameCount = Math.floor(dataInt16.length / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const PluralFruits: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetCount, setTargetCount] = useState(1);
  const [currentFruit, setCurrentFruit] = useState(FRUITS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const GOAL = 5;

  const speak = async (count: number, label: string) => {
    if (isSpeaking) return;
    const txt = count === 1 ? `Find one ${label}!` : `Find two ${label}s!`;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: txt }] }],
        config: { responseModalities: [Modality.AUDIO] }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
         const ctx = audioContextRef.current;
         if (ctx.state === 'suspended') await ctx.resume();
         const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
         const source = ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(ctx.destination);
         source.onended = () => setIsSpeaking(false);
         source.start();
      } else { setIsSpeaking(false); }
    } catch { setIsSpeaking(false); }
  };

  const nextRound = () => {
    const c = Math.random() > 0.5 ? 1 : 2;
    const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    setTargetCount(c);
    setCurrentFruit(f);
    speak(c, f.label.toLowerCase());
  };

  useEffect(() => { nextRound(); }, []);

  const handleChoice = (count: number) => {
    if (count === targetCount) {
      correctSfx.play();
      addScore(70);
      const n = progress + 1;
      setProgress(n);
      if (n >= GOAL) {
        setIsVictory(true);
        unlockLevel(18); // Unlock Pet Parlor
      } else {
        nextRound();
      }
    }
  };

  return (
    <div className="h-full bg-orange-50 flex flex-col items-center justify-center p-8 relative">
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-white/50 px-4 py-1.5 rounded-full text-xs font-black text-orange-700">
        🍎 PLURALS: {progress}/{GOAL}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-16 z-10 w-full max-w-5xl">
        <h2 className="text-5xl md:text-8xl font-black text-slate-800 uppercase text-center tracking-tighter">
          {targetCount === 1 ? `ONE ${currentFruit.label}` : `TWO ${currentFruit.label}S`}
        </h2>

        <div className="flex flex-col md:flex-row gap-8 md:gap-16 w-full">
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.9 }} 
             onClick={() => handleChoice(1)}
             className="flex-1 bg-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center justify-center gap-6 border-8 border-white hover:border-orange-200 transition-all"
           >
              <div className="text-[10rem] md:text-[14rem]">{currentFruit.icon}</div>
              <div className="text-3xl font-black text-slate-400 tracking-widest">ONE</div>
           </motion.button>

           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.9 }} 
             onClick={() => handleChoice(2)}
             className="flex-1 bg-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center justify-center border-8 border-white hover:border-orange-200 transition-all"
           >
              <div className="flex gap-4 mb-4">
                 <div className="text-8xl md:text-[12rem]">{currentFruit.icon}</div>
                 <div className="text-8xl md:text-[12rem]">{currentFruit.icon}</div>
              </div>
              <div className="text-3xl font-black text-slate-400 tracking-widest">TWO</div>
           </motion.button>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-orange-950/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[5rem] text-center border-[12px] border-orange-400 shadow-2xl">
            <div className="text-[10rem] mb-6 animate-bounce">🦖</div>
            <h2 className="text-5xl font-black text-slate-800 uppercase mb-4">You are Amazing!</h2>
            <p className="text-2xl text-slate-500 font-bold mb-10">Adventure Continues!</p>
            <button onClick={() => navigate('/map')} className="w-full bg-orange-500 text-white text-4xl font-black py-8 rounded-[3rem] shadow-[0_12px_0_0_#C2410C] active:translate-y-1 transition-all">
              NEXT WORLD!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PluralFruits;
