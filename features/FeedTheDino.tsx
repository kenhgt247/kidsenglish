
import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Volume2, ArrowRight } from 'lucide-react';
import { Howl } from 'howler';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { FoodItem } from '../types.ts';
import { useNavigate } from 'react-router-dom';

const createSfx = (src: string) => new Howl({ 
  src: [src], 
  volume: 0.4,
  html5: true,
});

const chompSfx = createSfx('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
const bonkSfx = createSfx('https://actions.google.com/sounds/v1/cartoon/boing.ogg');
const pickupSfx = createSfx('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');

const FOOD_ITEMS: FoodItem[] = [
  { id: 'apple', label: 'APPLE', icon: '🍎', color: 'bg-red-400' },
  { id: 'banana', label: 'BANANA', icon: '🍌', color: 'bg-yellow-400' },
  { id: 'cake', label: 'CAKE', icon: '🍰', color: 'bg-pink-400' },
  { id: 'orange', label: 'ORANGE', icon: '🍊', color: 'bg-orange-400' },
  { id: 'bread', label: 'BREAD', icon: '🍞', color: 'bg-amber-400' },
];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer | null> {
  const numSamples = Math.floor(data.byteLength / 2);
  const frameCount = Math.floor(numSamples / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      const sampleIndex = (i * numChannels + channel) * 2;
      if (sampleIndex + 1 < data.byteLength) {
        const sample = dataView.getInt16(sampleIndex, true);
        channelData[i] = sample / 32768.0;
      }
    }
  }
  return buffer;
}

const FeedTheDino: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetItem, setTargetItem] = useState<FoodItem>(FOOD_ITEMS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const dinoRef = useRef<HTMLDivElement>(null);
  const dinoControls = useAnimation();

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
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Speak in a very clear, friendly British accent for a toddler. Speak slowly: "Can you feed me the ${text}, please?"` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        },
      });
      
      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
      if (audioPart?.inlineData?.data) {
        const ctx = initAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const buffer = await decodeAudioData(decodeBase64(audioPart.inlineData.data), ctx, 24000, 1);
        if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.onended = () => setIsSpeaking(false);
          source.start();
        } else { setIsSpeaking(false); }
      } else { setIsSpeaking(false); }
    } catch (e) { setIsSpeaking(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => speak(targetItem.label), 800);
    return () => clearTimeout(timer);
  }, [targetItem]);

  const handleDragEnd = async (event: any, info: any, item: FoodItem) => {
    initAudioContext().resume();
    if (!dinoRef.current || isVictory) return;
    const dinoRect = dinoRef.current.getBoundingClientRect();
    const isOver = info.point.x > dinoRect.left && info.point.x < dinoRect.right && 
                   info.point.y > dinoRect.top && info.point.y < dinoRect.bottom;

    if (isOver && item.id === targetItem.id) {
      addScore(10);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      chompSfx.play();
      await dinoControls.start({ scale: [1, 1.3, 1], transition: { duration: 0.3 } });
      if (nextProgress >= 5) { setIsVictory(true); unlockLevel(2); }
      else { setTargetItem(FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)]); }
    } else if (isOver) {
      bonkSfx.play();
      dinoControls.start({ x: [-10, 10, -10, 10, 0] });
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-between py-10 bg-gradient-to-b from-sky-50 to-emerald-50 relative overflow-hidden px-4">
      <Confetti active={isVictory} />
      <motion.button 
        onClick={() => speak(targetItem.label)}
        className="z-10 bg-white px-10 py-6 rounded-[2.5rem] shadow-xl flex items-center gap-4 border-4 border-emerald-400 active:scale-95 transition-all"
      >
        <Volume2 className={isSpeaking ? "text-emerald-500 animate-pulse" : "text-slate-300"} size={40} />
        <span className="text-3xl md:text-4xl font-black text-slate-800 uppercase">FEED ME: {targetItem.label}</span>
      </motion.button>

      <motion.div ref={dinoRef} animate={dinoControls} className="w-64 h-64 md:w-96 md:h-96 bg-emerald-400 rounded-full flex items-center justify-center shadow-2xl border-8 border-white text-[10rem] md:text-[18rem] relative">
        <span className="select-none pointer-events-none">🦖</span>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-6 px-6 z-20">
        {FOOD_ITEMS.map(item => (
          <motion.div key={item.id} drag dragSnapToOrigin onDragStart={() => { pickupSfx.play(); initAudioContext().resume(); }} onDragEnd={(e, i) => handleDragEnd(e, i, item)} className={`w-24 h-24 md:w-36 md:h-36 ${item.color} rounded-3xl shadow-lg flex items-center justify-center text-5xl md:text-6xl cursor-grab active:cursor-grabbing border-4 border-white touch-none`}>
            <span className="select-none pointer-events-none">{item.icon}</span>
          </motion.div>
        ))}
      </div>

      <div className="fixed top-6 right-6 bg-white px-6 py-2 rounded-full border-4 border-emerald-100 font-black text-emerald-600 shadow-lg text-xl">
        {progress}/5 🌟
      </div>

      {isVictory && (
        <div className="fixed inset-0 z-[200] bg-emerald-500 flex flex-col items-center justify-center text-white p-6 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-8">
            <div className="text-[12rem]">🥳</div>
            <h2 className="text-6xl font-black uppercase tracking-tighter">Brilliant!</h2>
            <button onClick={() => navigate('/map')} className="bg-white text-emerald-500 px-16 py-8 rounded-full text-3xl font-black shadow-2xl flex items-center gap-4 active:scale-95 transition-all">
              NEXT <ArrowRight size={40} />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FeedTheDino;
