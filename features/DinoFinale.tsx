import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Star, ChevronLeft } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const DinoFinale: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const speak = async () => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Congratulations! Your score is ${state.score}!` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         const ctx = initAudioContext();
         if (ctx.state === 'suspended') await ctx.resume();
         const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
         const source = ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(ctx.destination);
         source.onended = () => setIsSpeaking(false);
         source.start();
      } else setIsSpeaking(false);
    } catch { setIsSpeaking(false); }
  };

  useEffect(() => { 
    setIsVictory(true);
    const timer = setTimeout(speak, 1200); 
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full w-full bg-gradient-to-b from-sky-400 to-indigo-600 flex flex-col items-center justify-center p-6 relative overflow-hidden safe-pb safe-pt">
      <Confetti active={isVictory} />
      
      <div className="flex flex-col items-center w-full max-w-sm gap-6 md:gap-10">
        {/* Giant Dino */}
        <motion.div animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="text-[10rem] md:text-[14rem] drop-shadow-2xl">
          🦖
        </motion.div>

        {/* Score Card */}
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl w-full border-4 md:border-8 border-white flex flex-col items-center gap-6">
           <div className="text-center">
             <h1 className="text-4xl md:text-6xl font-black text-indigo-900 leading-none uppercase">THE END</h1>
             <p className="text-lg md:text-xl font-bold text-slate-500 mt-2">Amazing Job!</p>
           </div>

           <div className="flex items-center gap-3 bg-yellow-400 text-white px-8 py-4 rounded-2xl text-3xl font-black shadow-xl">
              <Star fill="currentColor" size={32} />
              <span>{state.score}</span>
           </div>

           <div className="flex flex-col gap-3 w-full">
             <button onClick={speak} className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl border border-indigo-100 active:bg-indigo-100">
               <Volume2 size={20} className={isSpeaking ? 'animate-pulse' : ''} />
               HEAR SCORE
             </button>
             <button onClick={() => navigate('/')} className="w-full bg-indigo-600 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_8px_0_0_#3730A3] active:translate-y-1 transition-all uppercase flex items-center justify-center gap-2">
               <ChevronLeft size={28} /> REPLAY
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DinoFinale;