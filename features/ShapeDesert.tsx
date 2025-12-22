
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Square, Circle, Triangle, Pentagon } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const matchSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });

const SHAPES = [
  { id: 'square', label: 'Square', icon: <Square size={48} />, color: 'bg-red-500' },
  { id: 'circle', label: 'Circle', icon: <Circle size={48} />, color: 'bg-blue-500' },
  { id: 'triangle', label: 'Triangle', icon: <Triangle size={48} />, color: 'bg-yellow-500' },
  { id: 'pentagon', label: 'Pentagon', icon: <Pentagon size={48} />, color: 'bg-purple-500' },
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

const ShapeDesert: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(SHAPES[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const GOAL = 5;

  const speak = async (text: string) => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Find the ${text} shape!` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         if (!audioContextRef.current) {
           audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
         }
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
    const next = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    setTarget(next);
    setSlots(SHAPES.sort(() => 0.5 - Math.random()));
    speak(next.label);
  };

  useEffect(() => { nextRound(); }, []);

  const handleMatch = (id: string) => {
    if (id === target.id) {
      matchSfx.play();
      addScore(30);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        unlockLevel(7);
      } else { nextRound(); }
    }
  };

  return (
    <div className="h-full bg-[#FEF3C7] overflow-hidden flex flex-col p-4 md:p-8 relative">
      <Confetti active={isVictory} />
      <div className="absolute bottom-0 w-full h-1/4 bg-[#FCD34D] rounded-t-[10rem] opacity-30 pointer-events-none" />
      
      {/* Mini Progress - Discreet */}
      <div className="absolute top-4 left-4 z-10 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-amber-700">
        {progress}/{GOAL}
      </div>

      <div className="flex-1 flex flex-row items-center justify-center gap-6 md:gap-12 z-10">
        <motion.div 
          key={target.id}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border-4 md:border-8 border-amber-200 flex flex-col items-center gap-2 md:gap-4 shrink-0"
        >
          <div className="text-amber-300 opacity-40 uppercase font-black tracking-widest text-[10px] md:text-xs">Find this!</div>
          <div className="text-slate-800 scale-[1.5] md:scale-[2.5]">{target.icon}</div>
          <button onClick={() => speak(target.label)} className="mt-2 md:mt-4 p-3 bg-amber-100 rounded-full text-amber-600 active:scale-110">
             <Volume2 size={24} className={isSpeaking ? 'animate-pulse' : ''} />
          </button>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm md:max-w-xl">
          {slots.map(s => (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleMatch(s.id)}
              className="h-24 md:h-32 rounded-3xl md:rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center border-4 border-transparent active:border-amber-400 transition-all text-slate-700"
            >
              <div className="scale-75 md:scale-100">{s.icon}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-amber-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-sm w-full border-8 border-amber-400 flex flex-col items-center gap-6">
            <div className="text-6xl">🏜️</div>
            <h2 className="text-2xl font-black text-slate-800 uppercase leading-none">Desert Master!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-amber-500 text-white text-xl font-black py-4 rounded-2xl shadow-[0_8px_0_0_#D97706] active:translate-y-1">
              ONWARD!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShapeDesert;
