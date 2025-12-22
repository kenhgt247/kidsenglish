
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
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

const EggCounter: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetCount, setTargetCount] = useState(3);
  const [options, setOptions] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const GOAL = 5;

  const speak = async (num: number) => {
    if (isSpeaking) return;
    const phrase = `Can you find ${num} eggs?`;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Say warmly: ${phrase}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
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

  const startRound = useCallback(() => {
    const count = Math.floor(Math.random() * 6) + 1;
    setTargetCount(count);
    const opts = new Set([count]);
    while (opts.size < 3) {
      opts.add(Math.floor(Math.random() * 9) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));
    speak(count);
  }, []);

  useEffect(() => { startRound(); }, []);

  const handleSelect = (num: number) => {
    if (num === targetCount) {
      crackSfx.play();
      addScore(25);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        winSfx.play();
        unlockLevel(6);
      } else { startRound(); }
    } else {
      crackSfx.play();
    }
  };

  return (
    <div className="h-full w-full bg-[#FDF4E3] overflow-hidden flex flex-col items-center p-4 md:p-8 relative">
      <Confetti active={isVictory} />
      
      {/* Mini Progress - Moved to Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/80 px-4 py-1.5 rounded-full font-black text-amber-700 text-xs border border-amber-200">
          🥚 {progress}/{GOAL}
        </div>
      </div>

      <motion.button 
        key={targetCount}
        onClick={() => !isSpeaking && speak(targetCount)}
        className="z-30 bg-white/90 px-8 py-4 rounded-[2.5rem] shadow-xl border-4 border-amber-200 flex items-center gap-3 active:scale-95"
      >
        <Volume2 className={isSpeaking ? "text-amber-500 animate-pulse" : "text-amber-200"} size={32} />
        <span className="text-2xl md:text-4xl font-black text-amber-900 uppercase">How many?</span>
      </motion.button>

      <div className="flex-1 flex items-center justify-center w-full max-w-lg mt-4">
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {Array.from({ length: targetCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.05, type: 'spring' }}
              className="w-16 h-20 md:w-24 md:h-32 bg-white rounded-[40%_40%_50%_50%] shadow-lg border-2 border-amber-50 flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute top-2 left-2 w-4 h-8 bg-white/40 rounded-full blur-sm" />
              <span className="text-3xl md:text-5xl">🥚</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-full flex justify-center gap-4 mt-8 z-20">
        {options.map((num) => (
          <motion.button
            key={num}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSelect(num)}
            className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-3xl shadow-xl border-4 border-amber-100 flex items-center justify-center text-4xl font-black text-amber-600 active:bg-amber-50"
          >
            {num}
          </motion.button>
        ))}
      </div>

      {isVictory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-amber-950/70 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl max-w-sm w-full flex flex-col items-center gap-6">
            <div className="text-7xl">🦖</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Eggspert!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-amber-500 text-white text-xl font-black py-5 rounded-2xl shadow-[0_6px_0_0_#D97706]">
              FANTASTIC!
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EggCounter;
