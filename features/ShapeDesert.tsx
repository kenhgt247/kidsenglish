import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Square, Circle, Triangle, Pentagon, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const matchSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });

const SHAPES = [
  { id: 'square', label: 'SQUARE', icon: <Square size={64} />, color: 'bg-red-500' },
  { id: 'circle', label: 'CIRCLE', icon: <Circle size={64} />, color: 'bg-blue-500' },
  { id: 'triangle', label: 'TRIANGLE', icon: <Triangle size={64} />, color: 'bg-yellow-500' },
  { id: 'pentagon', label: 'PENTAGON', icon: <Pentagon size={64} />, color: 'bg-purple-500' },
];

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

const ShapeDesert: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(SHAPES[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
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

  const speak = async (text: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Where is the ${text} shape?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a warm, clear British English teacher for toddlers. Use a friendly UK accent. Speak slowly and clearly. Encourage the child.",
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

  const nextRound = () => {
    const next = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    setTarget(next);
    setSlots([...SHAPES].sort(() => 0.5 - Math.random()));
  };

  useEffect(() => { nextRound(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => speak(target.label), 500);
    return () => clearTimeout(timer);
  }, [target]);

  const handleMatch = (id: string) => {
    initAudioContext().resume();
    if (id === target.id) {
      matchSfx.play();
      addScore(30);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= 5) {
        setIsVictory(true);
        unlockLevel(7);
      } else { nextRound(); }
    }
  };

  return (
    <div className="h-full bg-[#FEF3C7] overflow-hidden flex flex-col p-8 relative" onClick={() => !isSpeaking && speak(target.label)}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-white/50 backdrop-blur-sm px-6 py-2 rounded-full font-black text-amber-700 text-sm">🏜️ {progress}/5</div>
      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10">
        <motion.div key={target.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl border-8 border-amber-200 flex flex-col items-center gap-4 shrink-0">
          <div className="text-amber-300 opacity-40 uppercase font-black text-xs">FIND THIS!</div>
          <div className="text-slate-800 transform scale-150">{target.icon}</div>
          <button onClick={(e) => { e.stopPropagation(); speak(target.label); }} className="mt-4 p-4 bg-amber-100 rounded-full text-amber-600 active:scale-125 transition-all">
             <Volume2 size={32} className={isSpeaking ? 'animate-pulse' : ''} />
          </button>
        </motion.div>
        <div className="grid grid-cols-2 gap-8 w-full max-w-xl">
          {slots.map(s => (
            <motion.button key={s.id} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleMatch(s.id); }} className="h-32 md:h-44 rounded-[3rem] bg-white shadow-2xl flex items-center justify-center border-4 border-transparent active:border-amber-400 transition-all text-slate-700">
              <div className="transform scale-125">{s.icon}</div>
            </motion.button>
          ))}
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-amber-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-sm w-full border-8 border-amber-400 flex flex-col items-center gap-8">
            <div className="text-8xl">🏜️</div>
            <h2 className="text-4xl font-black text-slate-800 uppercase leading-none">Dune Master!</h2>
            <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-amber-500 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_8px_0_0_#92400E] active:translate-y-1 transition-all">LET'S GO <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShapeDesert;