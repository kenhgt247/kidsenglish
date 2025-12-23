import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, ThermometerSnowflake, ThermometerSun, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });
const correctSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.5 });
const failSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2041/2041-preview.mp3'], volume: 0.4 });

const ITEMS = [
  { id: 'ice', label: 'ICE', icon: '🧊', type: 'cold' },
  { id: 'fire', label: 'FIRE', icon: '🔥', type: 'hot' },
  { id: 'sun', label: 'SUN', icon: '☀️', type: 'hot' },
  { id: 'snow', label: 'SNOWMAN', icon: '☃️', type: 'cold' },
  { id: 'soup', label: 'HOT SOUP', icon: '🍲', type: 'hot' },
  { id: 'icecream', label: 'ICE CREAM', icon: '🍦', type: 'cold' },
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

const ArcticOpposites: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [currentItem, setCurrentItem] = useState(ITEMS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const speak = async (text: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Is the ${text} hot or cold?` }] }],
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

  const nextItem = () => {
    setFeedback(null);
    const pool = ITEMS.filter(item => item.id !== currentItem.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrentItem(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => speak(currentItem.label), 500);
    return () => clearTimeout(timer);
  }, [currentItem]);

  const handleSelect = (type: string) => {
    initAudioContext().resume();
    if (feedback !== null) return;
    if (type === currentItem.type) {
      correctSfx.play();
      setFeedback('correct');
      addScore(35);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 6) {
          setIsVictory(true);
          winSfx.play();
          unlockLevel(8);
        } else nextItem();
      }, 1200);
    } else {
      failSfx.play();
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  return (
    <div className="h-full bg-blue-50 overflow-hidden flex flex-col p-8 relative" onClick={() => !isSpeaking && speak(currentItem.label)}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-blue-600/20 px-6 py-2 rounded-full font-black text-blue-700 text-sm">❄️ {progress}/6</div>
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-16 z-10">
        <motion.div key={currentItem.id} animate={feedback === 'correct' ? { scale: [1, 1.2, 1] } : feedback === 'incorrect' ? { x: [-10, 10, -10, 10, 0] } : {}} className={`bg-white w-56 h-56 md:w-80 md:h-80 rounded-[4rem] shadow-2xl border-8 flex flex-col items-center justify-center relative transition-all duration-300 ${feedback === 'correct' ? 'border-green-400 bg-green-50' : feedback === 'incorrect' ? 'border-red-400 bg-red-50' : 'border-blue-100'}`}>
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className={`absolute inset-0 flex items-center justify-center z-10 rounded-full ${feedback === 'correct' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {feedback === 'correct' ? <CheckCircle2 size={120} className="text-green-500" /> : <XCircle size={120} className="text-red-500" />}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-8xl md:text-[10rem] mb-4">{currentItem.icon}</div>
          <div className="text-2xl md:text-3xl font-black text-blue-900">{currentItem.label}</div>
          <button onClick={(e) => { e.stopPropagation(); speak(currentItem.label); }} className="absolute -bottom-6 -right-6 bg-blue-500 p-5 rounded-full text-white shadow-xl active:scale-125 transition-all z-20">
            <Volume2 size={32} className={isSpeaking ? 'animate-pulse' : ''} />
          </button>
        </motion.div>
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSelect('cold'); }} disabled={feedback !== null} className={`h-28 md:h-36 rounded-3xl bg-cyan-500 text-white shadow-2xl border-4 border-white flex items-center justify-center gap-4 transition-all ${feedback !== null ? 'opacity-50' : 'active:brightness-110'}`}>
            <ThermometerSnowflake size={48} />
            <span className="text-3xl md:text-4xl font-black">COLD</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSelect('hot'); }} disabled={feedback !== null} className={`h-28 md:h-36 rounded-3xl bg-orange-500 text-white shadow-2xl border-4 border-white flex items-center justify-center gap-4 transition-all ${feedback !== null ? 'opacity-50' : 'active:brightness-110'}`}>
            <ThermometerSun size={48} />
            <span className="text-3xl md:text-4xl font-black">HOT</span>
          </motion.button>
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-sm w-full border-8 border-cyan-400 flex flex-col items-center gap-8">
            <div className="text-8xl animate-bounce">🐧</div>
            <h2 className="text-4xl font-black text-blue-900 uppercase">Ice Master!</h2>
            <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-cyan-600 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_10px_0_0_#0891B2] active:translate-y-1 transition-all">COOL! <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ArcticOpposites;