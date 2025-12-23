import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Flame } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const splashSfx = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/pop.ogg'], volume: 0.5 });
const winSfx = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/clapping_foley.ogg'], volume: 0.7 });

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

const AlphaVolcano: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetLetter, setTargetLetter] = useState('A');
  const [fallingLetters, setFallingLetters] = useState<{id: number, char: string, x: number}[]>([]);
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

  const speak = async (letter: string) => {
    if (isSpeaking) return;
    const phrase = `Quick! Catch the letter ${letter}!`;

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
      } else { useFallback(); }
    } catch { useFallback(); }
  };

  const spawnLetter = useCallback(() => {
    if (isVictory) return;
    const isTarget = Math.random() > 0.6;
    const char = isTarget ? targetLetter : ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const newLetter = { id: Date.now() + Math.random(), char, x: 10 + Math.random() * 80 };
    setFallingLetters(prev => [...prev.slice(-10), newLetter]);
  }, [targetLetter, isVictory]);

  useEffect(() => {
    const interval = setInterval(spawnLetter, 1500);
    speak(targetLetter);
    return () => clearInterval(interval);
  }, [targetLetter, spawnLetter]);

  const handleCatch = (id: number, char: string) => {
    initAudioContext().resume();
    if (char === targetLetter) {
      splashSfx.play();
      addScore(20);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setFallingLetters(prev => prev.filter(l => l.id !== id));
      if (nextProgress >= 5) { setIsVictory(true); winSfx.play(); unlockLevel(4); }
      else { setTargetLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]); }
    } else {
      setFallingLetters(prev => prev.filter(l => l.id !== id));
    }
  };

  return (
    <div className="h-full w-full bg-orange-950 overflow-hidden flex flex-col items-center p-8 relative" onClick={() => initAudioContext().resume()}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-20 bg-orange-600 px-6 py-2 rounded-full font-black text-white border-2 border-orange-400 shadow-xl">
        <Flame className="inline-block mr-2" size={20} /> {progress}/5
      </div>
      <motion.button 
        key={targetLetter}
        onClick={() => speak(targetLetter)}
        className="z-30 bg-white/10 backdrop-blur-xl px-12 py-6 rounded-[3rem] border-4 border-orange-400 flex flex-col items-center shadow-2xl active:scale-95 transition-all"
      >
        <Volume2 className={isSpeaking ? "text-orange-400 animate-pulse" : "text-white/40"} size={40} />
        <span className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(255,165,0,0.8)]">{targetLetter}</span>
      </motion.button>
      <div className="flex-1 w-full relative mt-10">
        <AnimatePresence>
          {fallingLetters.map((l) => (
            <motion.button
              key={l.id}
              initial={{ y: -100, x: `${l.x}%`, opacity: 0 }}
              animate={{ y: 800, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 6, ease: "linear" }}
              onAnimationComplete={() => setFallingLetters(prev => prev.filter(item => item.id !== l.id))}
              onClick={() => handleCatch(l.id, l.char)}
              className="absolute w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl shadow-2xl border-4 border-white/60 flex items-center justify-center text-white text-5xl md:text-6xl font-black active:scale-125 z-20"
              style={{ left: `${l.x}%` }}
            >
              {l.char}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {isVictory && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[4rem] text-center shadow-2xl max-w-sm w-full border-8 border-orange-400">
            <div className="text-8xl mb-4">🌋</div>
            <h2 className="text-4xl font-black text-slate-800 uppercase">Volcano Hero!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-orange-600 text-white text-2xl font-black py-5 rounded-3xl shadow-[0_8px_0_0_#9A3412] active:translate-y-1 transition-all uppercase">MAP</button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AlphaVolcano;