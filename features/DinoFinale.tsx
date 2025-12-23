import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Heart, Star, ChevronLeft } from 'lucide-react';
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
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Brilliant! You've finished the adventure! You are a superstar! Your total score is ${state.score}. Well done!` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are an excited, warm British English teacher for kids. Use a very friendly UK accent. Speak clearly and joyfully.",
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
    <div className="h-full bg-gradient-to-b from-sky-400 to-indigo-600 flex flex-col items-center justify-center p-8 relative overflow-hidden" onClick={() => !isSpeaking && speak()}>
      <Confetti active={isVictory} />
      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 w-full max-w-4xl text-center">
        <motion.div animate={{ y: [0, -40, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="text-[15rem] md:text-[20rem] drop-shadow-2xl select-none">🦖</motion.div>
        <div className="bg-white/90 backdrop-blur-xl p-12 rounded-[4rem] shadow-2xl border-8 border-white flex flex-col items-center gap-8">
           <div className="space-y-2">
             <h1 className="text-6xl md:text-9xl font-black text-indigo-900 leading-none uppercase">THE END</h1>
             <p className="text-2xl md:text-3xl font-bold text-slate-500">Amazing Adventure!</p>
           </div>
           <div className="flex items-center gap-4 bg-yellow-400 text-white px-12 py-6 rounded-3xl text-4xl font-black shadow-2xl">
              <Star fill="currentColor" size={48} />
              <span>{state.score}</span>
           </div>
           <div className="flex flex-col gap-4 w-full">
             <button onClick={(e) => { e.stopPropagation(); speak(); }} className="flex items-center justify-center gap-3 bg-indigo-100 text-indigo-600 font-black py-4 rounded-2xl border-2 border-indigo-200">
               <Volume2 size={24} className={isSpeaking ? 'animate-pulse' : ''} />
               HEAR SCORE
             </button>
             <button onClick={(e) => { e.stopPropagation(); navigate('/'); }} className="w-full bg-indigo-600 text-white text-3xl font-black py-8 rounded-[2.5rem] shadow-[0_12px_0_0_#3730A3] active:translate-y-2 transition-all uppercase flex items-center justify-center gap-3"><ChevronLeft size={32} /> PLAY AGAIN</button>
           </div>
        </div>
      </div>
      <div className="fixed top-8 right-8 flex gap-4 text-red-500/20"><Heart size={64} fill="currentColor" /><Heart size={48} fill="currentColor" /></div>
    </div>
  );
};

export default DinoFinale;