
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Volume2, ArrowRight } from 'lucide-react';
import { Howl } from 'howler';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { FoodItem, GameStatus } from '../types.ts';
import { useNavigate } from 'react-router-dom';

const chompSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2305/2305-preview.mp3'], volume: 0.8 });
const bonkSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });
const pickupSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4 });

const FOOD_ITEMS: FoodItem[] = [
  { id: 'apple', label: 'APPLE', icon: '🍎', color: 'bg-red-400' },
  { id: 'car', label: 'CAR', icon: '🚗', color: 'bg-blue-400' },
  { id: 'ball', label: 'BALL', icon: '⚽', color: 'bg-orange-400' },
  { id: 'banana', label: 'BANANA', icon: '🍌', color: 'bg-yellow-400' },
  { id: 'cake', label: 'CAKE', icon: '🍰', color: 'bg-pink-400' },
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

const FeedTheDino: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetItem, setTargetItem] = useState<FoodItem>(FOOD_ITEMS[0]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const dinoRef = useRef<HTMLDivElement>(null);
  const dinoControls = useAnimation();
  const audioContextRef = useRef<AudioContext | null>(null);

  const GOAL = 5;

  const speakInstruction = async (text: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    const phrase = `Feed me the ${text}!`;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Say cheerfully: ${phrase}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else { setIsSpeaking(false); }
    } catch { setIsSpeaking(false); }
  };

  const startRound = useCallback(() => {
    const pool = FOOD_ITEMS.filter(f => f.id !== targetItem.id);
    const random = pool[Math.floor(Math.random() * pool.length)];
    setTargetItem(random);
    setStatus(GameStatus.PLAYING);
    if (!isVictory) speakInstruction(random.label);
  }, [targetItem.id, isVictory]);

  useEffect(() => {
    // Gọi màn đầu tiên ngay khi vào
    const firstItem = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
    setTargetItem(firstItem);
    speakInstruction(firstItem.label);
  }, []);

  const handleDragStart = () => { pickupSfx.play(); };

  const handleDragEnd = async (event: any, info: any, item: FoodItem) => {
    if (!dinoRef.current || isVictory) return;
    const dinoRect = dinoRef.current.getBoundingClientRect();
    const buffer = 30;
    const isOverDino = info.point.x > dinoRect.left - buffer && 
                       info.point.x < dinoRect.right + buffer && 
                       info.point.y > dinoRect.top - buffer && 
                       info.point.y < dinoRect.bottom + buffer;

    if (isOverDino && item.id === targetItem.id) {
      setStatus(GameStatus.SUCCESS);
      addScore(10);
      const newProgress = progress + 1;
      setProgress(newProgress);
      chompSfx.play();
      
      await dinoControls.start({
        scale: [1, 1.25, 0.95, 1.15, 1],
        rotate: [0, -15, 15, -10, 10, 0],
        y: [0, -40, 0, -20, 0],
        transition: { duration: 0.8, ease: "easeOut" }
      });

      if (newProgress >= GOAL) {
        setIsVictory(true);
        setShowConfetti(true);
        unlockLevel(2);
      } else {
        setTimeout(startRound, 1000);
      }
    } else if (isOverDino) {
      bonkSfx.play();
      await dinoControls.start({ x: [-15, 15, -15, 15, 0], transition: { duration: 0.4 } });
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-between py-6 px-4 bg-sky-50 relative overflow-hidden">
      <Confetti active={showConfetti} />

      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
          <span className="font-black text-slate-400 text-[10px] uppercase">Goal</span>
          <span className="font-black text-dino-green text-lg leading-none">{progress}/{GOAL}</span>
        </div>
      </div>

      {!isVictory && (
        <motion.div key={targetItem.id} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 mt-2">
          <button 
            onClick={() => !isSpeaking && speakInstruction(targetItem.label)} 
            className={`flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-xl border-4 transition-all ${isSpeaking ? 'border-dino-green scale-105' : 'border-transparent'}`}
          >
            <Volume2 className={isSpeaking ? 'text-dino-green animate-pulse' : 'text-slate-400'} size={24} />
            <span className="text-xl md:text-3xl font-black text-slate-800">
              {targetItem.label}
            </span>
          </button>
        </motion.div>
      )}

      <motion.div ref={dinoRef} animate={dinoControls} className="relative z-10 my-4">
        <div className="w-48 h-48 md:w-64 md:h-64 bg-dino-green rounded-[3rem] md:rounded-[4rem] flex flex-col items-center justify-center shadow-2xl border-8 border-white relative">
          <div className="flex gap-10 mt-2 z-10">
            {status === GameStatus.SUCCESS ? (
              <><span className="text-3xl font-black text-slate-800">^</span><span className="text-3xl font-black text-slate-800">^</span></>
            ) : (
              <><div className="w-4 h-4 bg-slate-800 rounded-full" /><div className="w-4 h-4 bg-slate-800 rounded-full" /></>
            )}
          </div>
          <motion.div 
            animate={status === GameStatus.SUCCESS ? { height: 60, width: 90 } : { height: 16, width: 32 }}
            className="bg-slate-800 mt-6 rounded-full flex items-center justify-center overflow-hidden"
          >
            {status === GameStatus.SUCCESS && <span className="text-3xl animate-bounce">👅</span>}
          </motion.div>
        </div>
      </motion.div>

      <div className="w-full max-w-2xl bg-white/40 backdrop-blur-md rounded-[2.5rem] p-4 flex flex-wrap justify-center gap-3 z-20">
        {FOOD_ITEMS.map((item) => (
          <motion.div
            key={item.id}
            drag={!isVictory}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragStart={handleDragStart}
            onDragEnd={(e, info) => handleDragEnd(e, info, item)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 1.2, zIndex: 50 }}
            className={`w-20 h-20 md:w-28 md:h-28 ${item.color} rounded-3xl shadow-lg flex items-center justify-center cursor-grab border-4 border-white active:shadow-2xl`}
          >
            <span className="text-4xl md:text-5xl select-none touch-none">{item.icon}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isVictory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] bg-dino-green/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl border-8 border-white flex flex-col items-center gap-6 max-w-sm w-full">
              <div className="text-7xl">👑</div>
              <h2 className="text-3xl font-black text-slate-800 uppercase leading-tight">Great Job!</h2>
              <button onClick={() => navigate('/map')} className="w-full bg-game-orange text-white text-xl font-black py-5 rounded-2xl shadow-[0_6px_0_0_#EA580C] active:translate-y-1 active:shadow-none">
                CONTINUE <ArrowRight className="inline ml-1" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedTheDino;
