
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Flame } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const splashSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'], volume: 0.5 });
const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

const AlphaVolcano: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetLetter, setTargetLetter] = useState('A');
  const [fallingLetters, setFallingLetters] = useState<{id: number, char: string, x: number}[]>([]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const GOAL = 5;

  const speak = async (letter: string) => {
    if (isSpeaking) return;
    const phrase = `Catch the letter ${letter}!`;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Say excitedly: ${phrase}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
        },
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
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

  const spawnLetter = useCallback(() => {
    if (isVictory) return;
    const isTarget = Math.random() > 0.6;
    const char = isTarget ? targetLetter : ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const newLetter = {
      id: Date.now() + Math.random(),
      char,
      x: 15 + Math.random() * 70,
    };
    setFallingLetters(prev => [...prev.slice(-8), newLetter]);
  }, [targetLetter, isVictory]);

  useEffect(() => {
    const interval = setInterval(spawnLetter, 1800);
    speak(targetLetter);
    return () => clearInterval(interval);
  }, [targetLetter, spawnLetter]);

  const handleCatch = (id: number, char: string) => {
    if (char === targetLetter) {
      splashSfx.play();
      addScore(20);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setFallingLetters(prev => prev.filter(l => l.id !== id));
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        winSfx.play();
        unlockLevel(4);
      } else {
        const nextTarget = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        setTargetLetter(nextTarget);
      }
    } else {
      setFallingLetters(prev => prev.filter(l => l.id !== id));
    }
  };

  return (
    <div className="h-full w-full bg-orange-950 overflow-hidden flex flex-col items-center p-4 relative">
      <Confetti active={isVictory} />
      
      {/* Mini Progress - Moved to Top Left */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-orange-600/80 px-4 py-1.5 rounded-full font-black text-white text-xs border border-orange-400">
          <Flame className="inline-block mr-1" size={12} /> {progress}/{GOAL}
        </div>
      </div>

      <motion.button 
        key={targetLetter}
        onClick={() => !isSpeaking && speak(targetLetter)}
        className="z-30 bg-white/10 backdrop-blur-xl px-8 py-4 rounded-[2rem] border-2 border-orange-400/50 flex flex-col items-center shadow-2xl active:scale-95"
      >
        <span className="text-white/40 font-black tracking-widest text-[10px] uppercase">Catch</span>
        <div className="flex items-center gap-3">
          <Volume2 className={isSpeaking ? "text-orange-400 animate-pulse" : "text-white/40"} size={24} />
          <span className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]">{targetLetter}</span>
        </div>
      </motion.button>

      <div className="flex-1 w-full relative mt-4">
        <AnimatePresence>
          {fallingLetters.map((l) => (
            <motion.button
              key={l.id}
              initial={{ y: -50, x: `${l.x}%`, opacity: 0 }}
              animate={{ y: 700, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 7, ease: "linear" }}
              onAnimationComplete={() => setFallingLetters(prev => prev.filter(item => item.id !== l.id))}
              onClick={() => handleCatch(l.id, l.char)}
              className="absolute w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl shadow-2xl border-4 border-white/40 flex items-center justify-center text-white text-4xl md:text-5xl font-black active:scale-150 z-20"
              style={{ left: `${l.x}%` }}
            >
              {l.char}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {isVictory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl max-w-sm w-full flex flex-col items-center gap-6">
            <div className="text-7xl">🌋</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase leading-tight">Fire Master!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-orange-600 text-white text-xl font-black py-5 rounded-2xl shadow-[0_6px_0_0_#9A3412]">
              BACK TO MAP
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AlphaVolcano;
