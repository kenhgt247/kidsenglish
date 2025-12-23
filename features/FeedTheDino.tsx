
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Volume2, ArrowRight, AlertCircle, Key } from 'lucide-react';
import { Howl } from 'howler';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { FoodItem, GameStatus } from '../types.ts';
import { useNavigate } from 'react-router-dom';

// Sử dụng link từ CDN khác hoặc các hiệu ứng mặc định nếu lỗi
const chompSfx = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/pop.ogg'], volume: 0.5 });
const bonkSfx = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/boing.ogg'], volume: 0.4 });
const pickupSfx = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'], volume: 0.3 });

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

const FeedTheDino: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetItem, setTargetItem] = useState<FoodItem>(FOOD_ITEMS[0]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const dinoRef = useRef<HTMLDivElement>(null);
  const dinoControls = useAnimation();
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const speakInstruction = async (text: string) => {
    if (isSpeaking) return;
    setQuotaError(false);
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Feed me the ${text}!` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      
      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
      if (audioPart?.inlineData?.data) {
        const ctx = initAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const buffer = await decodeAudioData(decodeBase64(audioPart.inlineData.data), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else { setIsSpeaking(false); }
    } catch (e: any) {
      setIsSpeaking(false);
      if (e.message?.includes('429') || e.message?.toLowerCase().includes('quota')) {
        setQuotaError(true);
      }
    }
  };

  const startRound = useCallback(() => {
    const random = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
    setTargetItem(random);
    setStatus(GameStatus.PLAYING);
    speakInstruction(random.label);
  }, []);

  useEffect(() => {
    setTimeout(() => speakInstruction(targetItem.label), 500);
  }, []);

  const handleDragEnd = async (event: any, info: any, item: FoodItem) => {
    if (!dinoRef.current || isVictory) return;
    const dinoRect = dinoRef.current.getBoundingClientRect();
    const isOver = info.point.x > dinoRect.left && info.point.x < dinoRect.right && 
                   info.point.y > dinoRect.top && info.point.y < dinoRect.bottom;

    if (isOver && item.id === targetItem.id) {
      setStatus(GameStatus.SUCCESS);
      addScore(10);
      setProgress(p => p + 1);
      chompSfx.play();
      await dinoControls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
      if (progress + 1 >= 5) {
        setIsVictory(true);
        setShowConfetti(true);
        unlockLevel(2);
      } else {
        setTimeout(startRound, 1000);
      }
    } else if (isOver) {
      bonkSfx.play();
      dinoControls.start({ x: [-10, 10, 0], transition: { duration: 0.2 } });
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-between py-10 bg-sky-50 relative overflow-hidden">
      <Confetti active={showConfetti} />
      
      <AnimatePresence>
        {quotaError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-[2rem] text-center max-w-xs shadow-2xl">
              <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
              <h2 className="text-xl font-black mb-2 uppercase">Out of Credits</h2>
              <p className="text-slate-500 mb-6 text-sm">Please select a Paid API Key to continue the adventure!</p>
              <button onClick={() => window.aistudio?.openSelectKey?.()} className="w-full bg-rose-500 text-white font-black py-4 rounded-xl">🔑 CHANGE KEY</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="z-10">
        <button onClick={() => speakInstruction(targetItem.label)} className="bg-white px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 border-4 border-emerald-400">
          <Volume2 className={isSpeaking ? "text-emerald-500 animate-pulse" : "text-slate-300"} size={32} />
          <span className="text-3xl font-black">{targetItem.label}</span>
        </button>
      </div>

      <motion.div ref={dinoRef} animate={dinoControls} className="w-48 h-48 bg-emerald-400 rounded-full flex items-center justify-center shadow-2xl border-8 border-white text-9xl">
        {status === GameStatus.SUCCESS ? '😋' : '🦖'}
      </motion.div>

      <div className="flex flex-wrap justify-center gap-4 px-4">
        {FOOD_ITEMS.map(item => (
          <motion.div
            key={item.id} drag dragSnapToOrigin
            onDragStart={() => pickupSfx.play()}
            onDragEnd={(e, i) => handleDragEnd(e, i, item)}
            className={`w-20 h-20 ${item.color} rounded-2xl shadow-lg flex items-center justify-center text-4xl cursor-grab active:cursor-grabbing border-4 border-white`}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      {isVictory && (
        <div className="fixed inset-0 z-[600] bg-emerald-500 flex flex-col items-center justify-center text-white p-8 text-center">
          <h2 className="text-5xl font-black mb-8 uppercase">Excellent!</h2>
          <button onClick={() => navigate('/map')} className="bg-white text-emerald-500 px-12 py-6 rounded-3xl text-2xl font-black shadow-2xl flex items-center gap-3">
            CONTINUE <ArrowRight size={32} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedTheDino;
