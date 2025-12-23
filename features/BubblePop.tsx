import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const popSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2305/2305-preview.mp3'], volume: 0.8 });
const successSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });

const COLORS = [
  { id: 'red', label: 'RED', hex: '#EF4444' },
  { id: 'blue', label: 'BLUE', hex: '#3B82F6' },
  { id: 'green', label: 'GREEN', hex: '#22C55E' },
  { id: 'yellow', label: 'YELLOW', hex: '#EAB308' },
  { id: 'purple', label: 'PURPLE', hex: '#A855F7' },
  { id: 'orange', label: 'ORANGE', hex: '#F97316' },
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

const BubblePop: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetColor, setTargetColor] = useState(COLORS[0]);
  const [bubbles, setBubbles] = useState<{id: number, color: any, x: number}[]>([]);
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

  const speak = async (color: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Can you pop the ${color} bubbles, please?` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a warm, clear British English teacher for toddlers. Use a friendly UK accent. Speak slowly and clearly. Encourage the child.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        },
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

  const spawnBubble = useCallback(() => {
    if (isVictory) return;
    const isTarget = Math.random() > 0.4;
    const color = isTarget ? targetColor : COLORS[Math.floor(Math.random() * COLORS.length)];
    const newBubble = { id: Date.now() + Math.random(), color, x: 10 + Math.random() * 80 };
    setBubbles(prev => [...prev.slice(-12), newBubble]);
  }, [targetColor, isVictory]);

  useEffect(() => {
    const interval = setInterval(spawnBubble, 1500);
    const timer = setTimeout(() => speak(targetColor.label), 500);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [targetColor]);

  const handlePop = (id: number, colorId: string) => {
    initAudioContext().resume();
    if (colorId === targetColor.id) {
      popSfx.play();
      addScore(15);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setBubbles(prev => prev.filter(b => b.id !== id));
      if (nextProgress >= 5) {
        setIsVictory(true);
        successSfx.play();
        unlockLevel(5);
      } else {
        const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setTargetColor(nextColor);
      }
    } else {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-cyan-400 to-blue-600 overflow-hidden flex flex-col items-center p-4 relative" onClick={() => !isSpeaking && speak(targetColor.label)}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full font-black text-white text-sm border border-white/30">🫧 {progress}/5</div>
      </div>
      <motion.button key={targetColor.id} onClick={(e) => { e.stopPropagation(); speak(targetColor.label); }} className="z-30 mt-10 bg-white px-12 py-6 rounded-[3rem] shadow-2xl flex flex-col items-center border-4 border-white active:scale-95 transition-all">
        <Volume2 className={isSpeaking ? "text-blue-500 animate-pulse" : "text-slate-200"} size={40} />
        <span className="text-4xl md:text-5xl font-black mt-2" style={{ color: targetColor.hex }}>{targetColor.label}</span>
      </motion.button>
      <div className="flex-1 w-full relative">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.button key={b.id} initial={{ y: 800, opacity: 0 }} animate={{ y: -200, opacity: 1 }} exit={{ scale: 3, opacity: 0 }} transition={{ duration: 10, ease: "linear" }} onClick={(e) => { e.stopPropagation(); handlePop(b.id, b.color.id); }} className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full shadow-inner border-2 border-white/40 flex items-center justify-center cursor-pointer active:scale-150 z-20" style={{ left: `${b.x}%`, backgroundColor: `${b.color.hex}66`, boxShadow: `inset 0 0 15px ${b.color.hex}, 0 10px 20px rgba(0,0,0,0.1)` }}>
              <div className="absolute top-3 left-6 w-5 h-2.5 bg-white/30 rounded-full rotate-45" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {isVictory && (
        <div className="fixed inset-0 z-[110] bg-blue-900/80 backdrop-blur-lg flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] text-center shadow-2xl max-w-sm w-full flex flex-col items-center gap-8 border-8 border-blue-400">
            <div className="text-8xl">🐳</div>
            <h2 className="text-4xl font-black text-slate-800 uppercase leading-none">Splash Hero!</h2>
            <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-blue-500 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_8px_0_0_#1E40AF] active:translate-y-1 transition-all">GO TO MAP <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BubblePop;