import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const crackSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });
const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });

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

const EggCounter: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetCount, setTargetCount] = useState(3);
  const [options, setOptions] = useState<number[]>([]);
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

  const speak = async (num: number) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Can you find ${num} eggs for me?` }] }],
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

  const startRound = useCallback(() => {
    const count = Math.floor(Math.random() * 5) + 1;
    setTargetCount(count);
    let opts = new Set([count]);
    while (opts.size < 3) opts.add(Math.floor(Math.random() * 8) + 1);
    setOptions(Array.from(opts).sort((a, b) => a - b));
  }, []);

  useEffect(() => { 
    startRound();
  }, [startRound]);

  useEffect(() => {
    const timer = setTimeout(() => speak(targetCount), 600);
    return () => clearTimeout(timer);
  }, [targetCount]);

  const handleSelect = (num: number) => {
    initAudioContext().resume();
    if (num === targetCount) {
      crackSfx.play();
      addScore(25);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= 5) {
        setIsVictory(true);
        winSfx.play();
        unlockLevel(6);
      } else { startRound(); }
    } else {
      crackSfx.play();
    }
  };

  return (
    <div className="h-full w-full bg-[#FDF4E3] overflow-hidden flex flex-col items-center p-8 relative" onClick={() => !isSpeaking && speak(targetCount)}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/80 px-6 py-2 rounded-full font-black text-amber-700 text-sm border border-amber-200">🥚 {progress}/5</div>
      </div>
      <motion.button key={targetCount} onClick={(e) => { e.stopPropagation(); speak(targetCount); }} className="z-30 bg-white/90 px-12 py-6 rounded-[2.5rem] shadow-xl border-4 border-amber-200 flex items-center gap-4 active:scale-95 transition-all">
        <Volume2 className={isSpeaking ? "text-amber-500 animate-pulse" : "text-amber-200"} size={40} />
        <span className="text-4xl font-black text-amber-900 uppercase">Find {targetCount} Eggs!</span>
      </motion.button>
      <div className="flex-1 flex items-center justify-center w-full max-w-lg">
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: targetCount }).map((_, i) => (
            <motion.div key={i} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.1, type: 'spring' }} className="w-20 h-28 md:w-28 md:h-40 bg-white rounded-[45%_45%_50%_50%] shadow-2xl border-2 border-amber-50 flex items-center justify-center relative">
              <span className="text-5xl md:text-7xl select-none">🥚</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="w-full flex justify-center gap-6 mb-12 z-20">
        {options.map((num) => (
          <motion.button key={num} whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); handleSelect(num); }} className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl shadow-2xl border-4 border-amber-200 flex items-center justify-center text-5xl font-black text-amber-600 active:bg-amber-100 transition-colors">{num}</motion.button>
        ))}
      </div>
      {isVictory && (
        <div className="fixed inset-0 z-[110] bg-amber-950/70 backdrop-blur-lg flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] text-center shadow-2xl max-w-sm w-full flex flex-col items-center gap-8 border-8 border-amber-400">
            <div className="text-8xl">🐣</div>
            <h2 className="text-4xl font-black text-slate-800 uppercase leading-none">Egg Expert!</h2>
            <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-amber-600 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_8px_0_0_#92400E] active:translate-y-1 transition-all">CONTINUE <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EggCounter;