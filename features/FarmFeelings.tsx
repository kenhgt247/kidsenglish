
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Smile, Frown, Annoyed, Volume2, Heart } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });
const correctSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.5 });
const farmSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/131/131-preview.mp3'], volume: 0.3 });

const FEELINGS = [
  { id: 'happy', label: 'HAPPY', icon: <Smile size={48} />, color: 'bg-emerald-400', animal: '🐷' },
  { id: 'sad', label: 'SAD', icon: <Frown size={48} />, color: 'bg-sky-400', animal: '🐮' },
  { id: 'angry', label: 'ANGRY', icon: <Annoyed size={48} />, color: 'bg-rose-400', animal: '🐔' },
];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const numSamples = Math.floor(data.byteLength / 2);
  const frameCount = Math.floor(numSamples / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      const sampleIndex = (i * numChannels + channel) * 2;
      const sample = dataView.getInt16(sampleIndex, true);
      channelData[i] = sample / 32768.0;
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
  const GOAL = 5;

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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });
      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
      const base64 = audioPart?.inlineData?.data;
      if (base64) {
         const ctx = initAudioContext();
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
    const next = FEELINGS[Math.floor(Math.random() * FEELINGS.length)];
    setTarget(next);
    speak(next.label.toLowerCase());
  };

  useEffect(() => { 
    farmSfx.play();
    nextRound(); 
    return () => { farmSfx.stop(); };
  }, []);

  const handleChoice = (id: string) => {
    initAudioContext().resume();
    if (id === target.id) {
      correctSfx.play();
      addScore(100);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        winSfx.play();
        unlockLevel(11);
      } else { 
        nextRound(); 
      }
    }
  };

  return (
    <div 
      className="h-full bg-[#F7FEE7] overflow-hidden flex flex-col p-4 md:p-8 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(target.label.toLowerCase()); }}
    >
      <Confetti active={isVictory} />
      
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-lime-600/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-black text-lime-700 border border-lime-200 uppercase">
          🚜 Farm Progress: {progress}/{GOAL}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 z-10">
        <motion.div 
          key={target.id}
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className="text-center shrink-0"
        >
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-[10rem] md:text-[14rem] mb-4 drop-shadow-xl"
          >
            {target.animal}
          </motion.div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); speak(target.label.toLowerCase()); }}
            className="flex items-center gap-3 bg-white px-8 py-4 rounded-[2rem] shadow-xl border-4 border-lime-200 active:scale-110 transition-transform"
          >
            <Volume2 className={isSpeaking ? 'text-lime-500 animate-pulse' : 'text-slate-300'} size={32} />
            <span className="text-2xl md:text-4xl font-black text-slate-800 uppercase tracking-tight">HOW DO I FEEL?</span>
          </button>
        </motion.div>

        <div className="flex flex-row md:flex-col gap-4 md:gap-6">
          {FEELINGS.map(f => (
            <motion.button
              key={f.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9, rotate: -5 }}
              onClick={() => handleChoice(f.id)}
              className={`${f.color} w-28 h-40 md:w-56 md:h-32 rounded-[2.5rem] shadow-2xl text-white border-4 md:border-8 border-white flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 active:brightness-90 transition-all`}
            >
              <div className="scale-90 md:scale-125">{f.icon}</div>
              <div className="font-black text-xs md:text-2xl uppercase tracking-widest">{f.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-32 bg-lime-200/50 rounded-t-[100%] pointer-events-none -z-10" />

      {isVictory && (
        <div className="fixed inset-0 bg-lime-900/95 backdrop-blur-3xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white p-12 md:p-20 rounded-[4rem] md:rounded-[6rem] shadow-2xl max-w-lg w-full border-[12px] border-lime-400 flex flex-col items-center gap-6 md:gap-10"
          >
             <div className="text-9xl md:text-[12rem] animate-bounce relative">
               🦖
               <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute -top-10 -right-10 text-red-500">
                 <Heart size={80} fill="currentColor" />
               </motion.div>
             </div>
             <div className="space-y-2">
               <h2 className="text-4xl md:text-7xl font-black text-lime-900 leading-none tracking-tighter uppercase">AMAZING!</h2>
               <p className="text-slate-500 font-bold text-lg md:text-2xl">You unlocked the next world!</p>
             </div>
             <button onClick={() => navigate('/map')} className="w-full bg-lime-500 text-white text-2xl md:text-4xl font-black py-6 md:py-10 rounded-[2rem] md:rounded-[3.5rem] shadow-[0_12px_0_0_#4D7C0F] hover:translate-y-1 transition-all uppercase">
               GO TO MAP
             </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FarmFeelings;
