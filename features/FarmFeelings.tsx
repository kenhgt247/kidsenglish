import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Smile, Frown, Annoyed, Volume2, Heart, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });
const correctSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.5 });
const farmSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/131/131-preview.mp3'], volume: 0.3 });

const FEELINGS = [
  { id: 'happy', label: 'HAPPY', icon: <Smile size={64} />, color: 'bg-emerald-400', animal: '🐷' },
  { id: 'sad', label: 'SAD', icon: <Frown size={64} />, color: 'bg-sky-400', animal: '🐮' },
  { id: 'angry', label: 'ANGRY', icon: <Annoyed size={64} />, color: 'bg-rose-400', animal: '🐔' },
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

const FarmFeelings: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(FEELINGS[0]);
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

  const speak = async (feeling: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `How does the animal feel? Is it ${feeling}?` }] }],
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
    const next = FEELINGS[Math.floor(Math.random() * FEELINGS.length)];
    setTarget(next);
  };

  useEffect(() => { 
    farmSfx.play();
    nextRound(); 
    return () => farmSfx.stop();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => speak(target.label.toLowerCase()), 500);
    return () => clearTimeout(timer);
  }, [target]);

  const handleChoice = (id: string) => {
    initAudioContext().resume();
    if (id === target.id) {
      correctSfx.play();
      addScore(40);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= 5) {
        setIsVictory(true);
        winSfx.play();
        unlockLevel(11);
      } else nextRound();
    }
  };

  return (
    <div className="h-full bg-[#F7FEE7] overflow-hidden flex flex-col p-8 relative" onClick={() => !isSpeaking && speak(target.label.toLowerCase())}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-lime-600/20 px-6 py-2 rounded-full font-black text-lime-700 text-sm border border-lime-200">🚜 {progress}/5</div>
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-16 z-10 w-full max-w-6xl mx-auto">
        <motion.div key={target.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center shrink-0">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[12rem] md:text-[16rem] drop-shadow-2xl select-none">{target.animal}</motion.div>
          <button onClick={(e) => { e.stopPropagation(); speak(target.label.toLowerCase()); }} className="mt-8 flex items-center gap-4 bg-white px-10 py-5 rounded-[2.5rem] shadow-2xl border-4 border-lime-200 active:scale-110 transition-all">
            <Volume2 className={isSpeaking ? 'text-lime-500 animate-pulse' : 'text-slate-300'} size={40} />
            <span className="text-3xl font-black text-slate-800 uppercase">HOW DO I FEEL?</span>
          </button>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full max-w-xs md:max-w-sm">
          {FEELINGS.map(f => (
            <motion.button key={f.id} whileTap={{ scale: 0.9, rotate: -3 }} onClick={(e) => { e.stopPropagation(); handleChoice(f.id); }} className={`${f.color} h-28 rounded-[2.5rem] shadow-2xl text-white border-4 border-white flex items-center justify-center gap-6 active:brightness-95 transition-all`}>
              {f.icon}
              <span className="font-black text-2xl uppercase tracking-widest">{f.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-lime-900/95 backdrop-blur-3xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[5rem] shadow-2xl max-w-lg w-full border-[12px] border-lime-400 flex flex-col items-center gap-8">
             <div className="text-9xl relative">🦖<motion.div animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute -top-10 -right-10 text-red-500"><Heart size={80} fill="currentColor" /></motion.div></div>
             <h2 className="text-5xl font-black text-lime-900 uppercase">Fantastic!</h2>
             <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-lime-500 text-white text-3xl font-black py-8 rounded-[2.5rem] shadow-[0_12px_0_0_#4D7C0F] active:translate-y-1 transition-all uppercase">GO TO MAP <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FarmFeelings;