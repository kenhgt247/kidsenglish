
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, ThermometerSnowflake, ThermometerSun, CheckCircle2, XCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });
const correctSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.5 });
const failSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2041/2041-preview.mp3'], volume: 0.4 });

const ITEMS = [
  { id: 'ice', label: 'Ice', icon: '🧊', type: 'cold' },
  { id: 'fire', label: 'Fire', icon: '🔥', type: 'hot' },
  { id: 'sun', label: 'Sun', icon: '☀️', type: 'hot' },
  { id: 'snow', label: 'Snowman', icon: '☃️', type: 'cold' },
  { id: 'soup', label: 'Hot Soup', icon: '🍲', type: 'hot' },
  { id: 'icecream', label: 'Ice Cream', icon: '🍦', type: 'cold' },
  { id: 'tea', label: 'Hot Tea', icon: '☕', type: 'hot' },
  { id: 'penguin', label: 'Iceberg', icon: '🏔️', type: 'cold' },
];

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

const ArcticOpposites: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [currentItem, setCurrentItem] = useState(ITEMS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const GOAL = 6;

  const speak = async (text: string) => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `What is the ${text}? Is it hot or cold?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         if (!audioContextRef.current) {
           audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
         }
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

  const nextItem = () => {
    setFeedback(null);
    const pool = ITEMS.filter(item => item.id !== currentItem.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrentItem(next);
    speak(next.label);
  };

  useEffect(() => {
    speak(currentItem.label);
  }, []);

  const handleSelect = (type: string) => {
    if (feedback !== null) return; // Prevent multiple clicks during animation

    if (type === currentItem.type) {
      correctSfx.play();
      setFeedback('correct');
      addScore(35);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      
      setTimeout(() => {
        if (nextProgress >= GOAL) {
          setIsVictory(true);
          winSfx.play();
          unlockLevel(8);
        } else {
          nextItem();
        }
      }, 1200);
    } else {
      failSfx.play();
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 800);
    }
  };

  return (
    <div className="h-full bg-blue-50 overflow-hidden flex flex-col p-4 md:p-8 relative">
      <Confetti active={isVictory} />
      
      {/* Mini Progress - Top Left to avoid Menu overlap */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
        <div className="bg-blue-600/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-black text-blue-700 uppercase tracking-tight">
          Level 8: {progress}/{GOAL}
        </div>
        <div className="h-1.5 w-32 bg-white/50 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${(progress / GOAL) * 100}%` }}
            className="h-full bg-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 z-10">
        {/* Main Item Card */}
        <motion.div 
          key={currentItem.id}
          animate={
            feedback === 'correct' ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } :
            feedback === 'incorrect' ? { x: [0, -10, 10, -10, 10, 0], scale: [1, 0.95, 1] } :
            { scale: 1, rotate: 0, x: 0 }
          }
          className={`
            bg-white w-48 h-48 md:w-80 md:h-80 rounded-[3rem] md:rounded-[5rem] shadow-2xl border-8 flex flex-col items-center justify-center relative shrink-0 transition-colors duration-300
            ${feedback === 'correct' ? 'border-green-400 bg-green-50' : 
              feedback === 'incorrect' ? 'border-red-400 bg-red-50' : 
              'border-blue-100'}
          `}
        >
          <div className="text-7xl md:text-[10rem] mb-2 md:mb-6">{currentItem.icon}</div>
          <div className="text-xl md:text-3xl font-black text-blue-900 uppercase tracking-[0.2em]">{currentItem.label}</div>
          
          <button 
            onClick={() => speak(currentItem.label)} 
            className="absolute -bottom-4 -right-4 bg-blue-500 p-4 rounded-full text-white shadow-xl hover:bg-blue-600 active:scale-125 transition-all"
          >
            <Volume2 size={24} className={isSpeaking ? 'animate-pulse' : ''} />
          </button>

          {/* Visual Overlay Feedback */}
          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-6 -left-6 bg-green-500 text-white p-3 rounded-full shadow-lg">
                <CheckCircle2 size={32} />
              </motion.div>
            )}
            {feedback === 'incorrect' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-6 -left-6 bg-red-500 text-white p-3 rounded-full shadow-lg">
                <XCircle size={32} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 w-full max-w-xs md:max-w-sm">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSelect('cold')}
            className={`
              h-24 md:h-32 rounded-3xl md:rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center gap-4 transition-all
              ${feedback === 'correct' && currentItem.type === 'cold' ? 'bg-green-500 ring-4 ring-green-200' : 'bg-cyan-500 hover:bg-cyan-600'}
            `}
          >
            <ThermometerSnowflake size={36} className="text-white md:scale-150" />
            <span className="text-white text-2xl md:text-4xl font-black uppercase tracking-wider">COLD</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSelect('hot')}
            className={`
              h-24 md:h-32 rounded-3xl md:rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center gap-4 transition-all
              ${feedback === 'correct' && currentItem.type === 'hot' ? 'bg-green-500 ring-4 ring-green-200' : 'bg-orange-500 hover:bg-orange-600'}
            `}
          >
            <ThermometerSun size={36} className="text-white md:scale-150" />
            <span className="text-white text-2xl md:text-4xl font-black uppercase tracking-wider">HOT</span>
          </motion.button>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0.8, y: 50 }} 
            animate={{ scale: 1, y: 0 }} 
            className="bg-white p-10 rounded-[3rem] md:rounded-[5rem] shadow-2xl max-w-sm w-full border-8 border-cyan-400 flex flex-col items-center gap-8"
          >
            <div className="text-8xl animate-bounce">🐧</div>
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-black text-blue-900 uppercase leading-none">Arctic Hero!</h2>
              <p className="text-slate-500 font-bold">You mastered hot and cold!</p>
            </div>
            <button 
              onClick={() => navigate('/map')} 
              className="w-full bg-cyan-600 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_10px_0_0_#0891B2] hover:translate-y-1 hover:shadow-[0_5px_0_0_#0891B2] transition-all"
            >
              GREAT JOB!
            </button>
          </motion.div>
        </div>
      )}

      {/* Background Decorative Floaters */}
      <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute bottom-10 left-10 text-6xl opacity-20 pointer-events-none">❄️</motion.div>
      <motion.div animate={{ y: [0, -30, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }} className="absolute top-20 right-20 text-6xl opacity-20 pointer-events-none">☁️</motion.div>
    </div>
  );
};

export default ArcticOpposites;
