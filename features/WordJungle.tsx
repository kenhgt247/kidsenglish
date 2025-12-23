
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const popSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });
const successSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });

const JUNGLE_WORDS = [
  { id: 'lion', label: 'LION', icon: '🦁' },
  { id: 'monkey', label: 'MONKEY', icon: '🐒' },
  { id: 'snake', label: 'SNAKE', icon: '🐍' },
  { id: 'bird', label: 'BIRD', icon: '🐦' },
  { id: 'flower', label: 'FLOWER', icon: '🌻' },
  { id: 'butterfly', label: 'BUTTERFLY', icon: '🦋' },
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

const WordJungle: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(JUNGLE_WORDS[0]);
  const [options, setOptions] = useState<any[]>([]);
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

  const speak = async (word: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    const phrase = `Where is the ${word}?`;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say playfully: ${phrase}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
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

  const startRound = useCallback(() => {
    const nextTarget = JUNGLE_WORDS[Math.floor(Math.random() * JUNGLE_WORDS.length)];
    const others = JUNGLE_WORDS.filter(w => w.id !== nextTarget.id).sort(() => 0.5 - Math.random()).slice(0, 2);
    setTarget(nextTarget);
    setOptions([...others, nextTarget].sort(() => 0.5 - Math.random()));
    speak(nextTarget.label);
  }, []);

  useEffect(() => { startRound(); }, []);

  const handleSelect = (item: any) => {
    initAudioContext().resume();
    if (item.id === target.id) {
      popSfx.play();
      addScore(15);
      const newProgress = progress + 1;
      setProgress(newProgress);
      if (newProgress >= 5) {
        setIsVictory(true);
        successSfx.play();
        unlockLevel(3);
      } else { startRound(); }
    }
  };

  return (
    <div 
      className="h-full w-full bg-emerald-50 overflow-hidden p-4 md:p-8 flex flex-col items-center relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(target.label); }}
    >
      <Confetti active={isVictory} />
      
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/80 px-4 py-2 rounded-2xl shadow-sm border border-emerald-100 font-black text-emerald-600 text-sm">
          {progress}/5
        </div>
      </div>

      <motion.button 
        key={target.id}
        onClick={(e) => { e.stopPropagation(); speak(target.label); }}
        className="z-30 bg-white px-8 py-4 rounded-[2rem] shadow-xl border-4 border-emerald-200 flex items-center gap-4 mb-6 active:scale-95 transition-transform"
      >
        <Volume2 className={isSpeaking ? "text-emerald-500 animate-pulse" : "text-slate-300"} size={32} />
        <span className="text-2xl md:text-4xl font-black text-slate-800 uppercase">Find the {target.label}</span>
      </motion.button>

      <div className="flex-1 w-full relative">
        <AnimatePresence>
          {!isVictory && options.map((item, idx) => (
            <motion.button
              key={`${item.id}-${progress}`}
              initial={{ scale: 0, y: 500 }}
              animate={{ 
                scale: 1, 
                y: [-100, 600], 
                x: [0, Math.sin(idx + progress) * 80]
              }}
              exit={{ scale: 0 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              onClick={() => handleSelect(item)}
              className="absolute w-28 h-28 md:w-40 md:h-40 bg-white/90 backdrop-blur-sm rounded-full shadow-2xl border-4 border-white flex flex-col items-center justify-center active:scale-125 z-20"
              style={{ left: `${15 + idx * 30}%` }}
            >
              <span className="text-5xl md:text-7xl mb-1">{item.icon}</span>
              <span className="text-emerald-600 font-black text-[10px] md:text-xs uppercase">{item.label}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {isVictory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-emerald-900/70 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
            <div className="text-7xl">🌴</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Explorer!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-game-orange text-white text-xl font-black py-5 rounded-2xl shadow-[0_6px_0_0_#EA580C]">
              CONTINUE
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WordJungle;
