import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Sun, CloudRain, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const popSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });
const magicSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.4 });

const COLORS = [
  { id: 'red', name: 'RED', hex: '#FF0000' },
  { id: 'orange', name: 'ORANGE', hex: '#FFA500' },
  { id: 'yellow', name: 'YELLOW', hex: '#FFFF00' },
  { id: 'green', name: 'GREEN', hex: '#008000' },
  { id: 'blue', name: 'BLUE', hex: '#0000FF' },
  { id: 'purple', name: 'PURPLE', hex: '#800080' },
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

const RainbowColors: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(COLORS[0]);
  const [unlockedColors, setUnlockedColors] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<any[]>([]);
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

  const speak = async (colorName: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Find the ${colorName} bubble to finish the rainbow!` }] }],
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

  const spawnBubble = () => {
    if (isVictory) return;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newBubble = { id: Math.random(), color, x: 10 + Math.random() * 80 };
    setBubbles(prev => [...prev.slice(-10), newBubble]);
  };

  useEffect(() => {
    const interval = setInterval(spawnBubble, 1500);
    const timer = setTimeout(() => speak(target.name), 600);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [target]);

  const handlePop = (bubble: any) => {
    initAudioContext().resume();
    if (bubble.color.id === target.id) {
      popSfx.play();
      magicSfx.play();
      addScore(50);
      setUnlockedColors(prev => [...new Set([...prev, target.id])]);
      const nextIndex = COLORS.findIndex(c => c.id === target.id) + 1;
      if (nextIndex < COLORS.length) setTarget(COLORS[nextIndex]);
      else { setIsVictory(true); unlockLevel(12); }
    } else {
      popSfx.play();
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    }
  };

  return (
    <div className="h-full bg-sky-300 overflow-hidden flex flex-col p-8 relative" onClick={() => !isSpeaking && speak(target.name)}>
      <Confetti active={isVictory} />
      <div className="absolute top-10 left-10 flex gap-4 opacity-50">
        <Sun size={64} className="text-yellow-400 animate-spin-slow" />
        <CloudRain size={48} className="text-white animate-bounce" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="relative w-[300px] h-[150px] md:w-[600px] md:h-[300px] overflow-hidden">
          {COLORS.map((c, i) => {
            const isUnlocked = unlockedColors.includes(c.id);
            const size = (COLORS.length - i) * (100 / COLORS.length);
            return (
              <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: isUnlocked ? 1 : 0.1, scale: isUnlocked ? 1 : 0.95 }} className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-t-full border-[12px] md:border-[24px]" style={{ width: `${size}%`, height: `${size * 2}%`, borderColor: isUnlocked ? c.hex : '#FFFFFF', zIndex: 50 - i }} />
            );
          })}
        </div>
        <motion.button key={target.id} onClick={(e) => { e.stopPropagation(); speak(target.name); }} className="mt-16 bg-white px-16 py-8 rounded-full shadow-2xl flex items-center gap-6 border-4 border-sky-100 active:scale-95 transition-all">
          <Volume2 className={isSpeaking ? 'text-sky-500 animate-pulse' : 'text-slate-300'} size={44} />
          <span className="text-4xl font-black uppercase tracking-tight" style={{ color: target.hex }}>FIND {target.name}!</span>
        </motion.button>
      </div>
      <AnimatePresence>
        {bubbles.map(b => (
          <motion.button key={b.id} initial={{ y: 800, opacity: 0 }} animate={{ y: -200, opacity: 1 }} exit={{ scale: 3, opacity: 0 }} transition={{ duration: 10, ease: 'linear' }} onClick={(e) => { e.stopPropagation(); handlePop(b); }} className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-2xl z-20" style={{ left: `${b.x}%`, backgroundColor: `${b.color.hex}88` }}>
            <div className="absolute top-4 left-6 w-8 h-4 bg-white/40 rounded-full" />
          </motion.button>
        ))}
      </AnimatePresence>
      {isVictory && (
        <div className="fixed inset-0 bg-sky-500/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-sm w-full border-8 border-white flex flex-col items-center gap-8">
            <div className="text-9xl animate-bounce">🌈</div>
            <h2 className="text-4xl font-black text-sky-900 uppercase leading-none">Rainbow King!</h2>
            <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-sky-600 text-white text-3xl font-black py-8 rounded-3xl shadow-[0_10px_0_0_#0284C7] active:translate-y-1 transition-all">COOL! <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RainbowColors;