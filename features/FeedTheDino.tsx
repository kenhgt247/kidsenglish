
import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Volume2, ArrowRight } from 'lucide-react';
import { Howl } from 'howler';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { FoodItem } from '../types.ts';
import { useNavigate } from 'react-router-dom';

const createSfx = (src: string) => new Howl({ src: [src], volume: 0.4, html5: true });
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

const FeedTheDino: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetItem, setTargetItem] = useState<FoodItem>(FOOD_ITEMS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
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
    if (isSpeaking) return;
    const phrase = `Feed me the ${text}, please!`;

    const useFallback = () => {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'en-GB';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    if (!process.env.API_KEY) {
      useFallback();
      return;
    }

    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: phrase }] }],
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
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else {
        useFallback();
      }
    } catch (e) {
      console.warn("Gemini TTS quota exceeded or error occurred. Falling back to browser voice.", e);
      useFallback();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => speak(targetItem.label), 800);
    return () => clearTimeout(timer);
  }, [targetItem]);

  const handleDragEnd = async (event: any, info: any, item: FoodItem) => {
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    if (!dinoRef.current || isVictory) return;
    const dinoRect = dinoRef.current.getBoundingClientRect();
    const isOver = info.point.x > dinoRect.left && info.point.x < dinoRect.right && 
                   info.point.y > dinoRect.top && info.point.y < dinoRect.bottom;

    if (isOver && item.id === targetItem.id) {
      addScore(10);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      chompSfx.play();
      await dinoControls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
      if (nextProgress >= 5) { setIsVictory(true); unlockLevel(2); }
      else { setTargetItem(FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)]); }
    } else if (isOver) {
      bonkSfx.play();
      dinoControls.start({ x: [-10, 10, -10, 10, 0] });
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-between py-6 md:py-10 bg-gradient-to-b from-sky-50 to-emerald-50 relative overflow-hidden safe-pb safe-pt" onClick={() => initAudioContext().resume()}>
      <Confetti active={isVictory} />
      
      <motion.button 
        onClick={() => speak(targetItem.label)}
        className="z-10 bg-white px-6 py-4 md:px-10 md:py-6 rounded-2xl md:rounded-[2.5rem] shadow-xl flex items-center gap-3 border-4 border-emerald-400 active:scale-95 mx-4"
      >
        <Volume2 className={isSpeaking ? "text-emerald-500 animate-pulse" : "text-slate-300"} size={32} />
        <span className="text-xl md:text-3xl font-black text-slate-800 uppercase">FEED ME: {targetItem.label}</span>
      </motion.button>

      <motion.div 
        ref={dinoRef} 
        animate={dinoControls} 
        className="w-48 h-48 md:w-80 md:h-80 bg-emerald-400 rounded-full flex items-center justify-center shadow-2xl border-4 md:border-8 border-white relative"
      >
        <span className="text-8xl md:text-[12rem] select-none pointer-events-none">🦖</span>
        <div className="absolute -bottom-4 md:-bottom-8 left-1/2 -translate-x-1/2 bg-white/60 px-4 py-1 rounded-full font-black text-emerald-600 text-sm md:text-xl">
          {progress}/5 🌟
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3 md:gap-6 px-4 md:px-8 z-20 pb-4">
        {FOOD_ITEMS.map(item => (
          <motion.div 
            key={item.id} 
            drag 
            dragSnapToOrigin 
            onDragStart={() => { pickupSfx.play(); initAudioContext().resume(); }} 
            onDragEnd={(e, i) => handleDragEnd(e, i, item)} 
            className={`w-20 h-20 md:w-32 md:h-32 ${item.color} rounded-2xl md:rounded-3xl shadow-lg flex items-center justify-center text-4xl md:text-6xl cursor-grab active:cursor-grabbing border-4 border-white touch-none`}
          >
            <span className="select-none pointer-events-none">{item.icon}</span>
          </motion.div>
        ))}
      </div>

      {isVictory && (
        <div className="fixed inset-0 z-[200] bg-emerald-500/95 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-6 text-center">
            <div className="text-9xl">🥳</div>
            <h2 className="text-4xl md:text-6xl font-black uppercase">Brilliant!</h2>
            <button onClick={() => navigate('/map')} className="bg-white text-emerald-500 px-12 py-5 rounded-full text-2xl font-black shadow-2xl flex items-center gap-3 active:scale-95">
              NEXT <ArrowRight size={32} />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FeedTheDino;
