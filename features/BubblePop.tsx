
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
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

const BubblePop: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetColor, setTargetColor] = useState(COLORS[0]);
  const [bubbles, setBubbles] = useState<{id: number, color: any, x: number}[]>([]);
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

  const speak = async (color: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    const phrase = `Pop the ${color} bubbles!`;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say cheerfully: ${phrase}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
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

  const spawnBubble = useCallback(() => {
    if (isVictory) return;
    const isTarget = Math.random() > 0.5;
    const color = isTarget ? targetColor : COLORS[Math.floor(Math.random() * COLORS.length)];
    const newBubble = {
      id: Date.now() + Math.random(),
      color,
      x: 10 + Math.random() * 80,
    };
    setBubbles(prev => [...prev.slice(-12), newBubble]);
  }, [targetColor, isVictory]);

  useEffect(() => {
    const interval = setInterval(spawnBubble, 1200);
    return () => clearInterval(interval);
  }, [spawnBubble]);

  const handlePop = (id: number, colorId: string) => {
    initAudioContext().resume();
    if (colorId === targetColor.id) {
      popSfx.play();
      addScore(15);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setBubbles(prev => prev.filter(b => b.id !== id));
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        successSfx.play();
        unlockLevel(5);
      } else {
        const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setTargetColor(nextColor);
        speak(nextColor.label);
      }
    } else {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div 
      className="h-full w-full bg-gradient-to-b from-cyan-400 to-blue-600 overflow-hidden flex flex-col items-center p-4 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(targetColor.label); }}
    >
      <Confetti active={isVictory} />
      
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full font-black text-white text-xs border border-white/30">
          🫧 {progress}/{GOAL}
        </div>
      </div>

      <motion.button 
        key={targetColor.id}
        onClick={(e) => { e.stopPropagation(); speak(targetColor.label); }}
        className="z-30 bg-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex flex-col items-center border-4 border-white active:scale-95"
      >
        <span className="text-slate-400 font-black tracking-widest text-[10px] uppercase mb-1">Pop</span>
        <div className="flex items-center gap-3">
          <Volume2 className={isSpeaking ? "text-blue-500 animate-pulse" : "text-slate-200"} size={32} />
          <span className="text-4xl font-black" style={{ color: targetColor.hex }}>{targetColor.label}</span>
        </div>
      </motion.button>

      <div className="flex-1 w-full relative mt-4">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.button
              key={b.id}
              initial={{ y: 800, opacity: 0 }}
              animate={{ y: -200, opacity: 1 }}
              exit={{ scale: 2, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 8, ease: "linear" }}
              onClick={() => handlePop(b.id, b.color.id)}
              className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full shadow-inner border-2 border-white/40 flex items-center justify-center cursor-pointer active:scale-150 z-20"
              style={{ 
                left: `${b.x}%`, 
                backgroundColor: `${b.color.hex}66`,
                boxShadow: `inset 0 0 15px ${b.color.hex}, 0 10px 20px rgba(0,0,0,0.1)` 
              }}
            >
              <div className="absolute top-3 left-6 w-5 h-2.5 bg-white/30 rounded-full rotate-45" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {isVictory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-blue-900/80 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl max-w-sm w-full flex flex-col items-center gap-6">
            <div className="text-7xl">🫧</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Bubble King!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-blue-500 text-white text-xl font-black py-5 rounded-2xl shadow-[0_6px_0_0_#2563EB]">
              NEXT LEVEL
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BubblePop;
