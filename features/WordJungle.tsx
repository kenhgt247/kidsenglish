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
    if (isSpeaking) return;
    const phrase = `Where is the ${word}?`;

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
    } else {
      popSfx.play();
    }
  };

  return (
    <div className="h-full w-full bg-emerald-50 overflow-hidden flex flex-col items-center justify-center p-4 relative safe-pb safe-pt" onClick={() => initAudioContext().resume()}>
      <Confetti active={isVictory} />
      
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <div className="bg-white/80 px-4 py-1.5 rounded-full shadow-sm font-black text-emerald-600 text-sm">
          {progress}/5 🌴
        </div>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center gap-8 md:gap-12">
        <motion.button 
          key={target.id}
          onClick={() => speak(target.label)}
          className="bg-white w-full max-w-sm px-8 py-6 rounded-3xl shadow-xl border-4 border-emerald-200 flex items-center justify-center gap-4 active:scale-95"
        >
          <Volume2 className={isSpeaking ? "text-emerald-500 animate-pulse" : "text-slate-300"} size={40} />
          <span className="text-2xl md:text-4xl font-black text-slate-800 uppercase tracking-tight">FIND: {target.label}</span>
        </motion.button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full px-4">
          <AnimatePresence mode="popLayout">
            {options.map((item) => (
              <motion.button
                key={`${item.id}-${progress}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSelect(item)}
                className="w-full aspect-square md:aspect-auto h-auto md:h-48 bg-white rounded-3xl shadow-lg border-4 border-white flex flex-col items-center justify-center active:border-emerald-400"
              >
                <span className="text-6xl md:text-8xl">{item.icon}</span>
                <span className="text-emerald-600 font-bold text-xs md:text-sm uppercase mt-2">{item.label}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 z-[110] bg-emerald-900/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 max-w-xs w-full border-4 border-emerald-400">
            <div className="text-8xl">🐯</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase leading-none">Jungle Hero!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-emerald-500 text-white text-xl font-black py-5 rounded-2xl shadow-lg">CONTINUE</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WordJungle;