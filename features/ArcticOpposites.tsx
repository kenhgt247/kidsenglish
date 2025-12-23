
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
        contents: [{ parts: [{ text: `What is the ${text}? Is it hot or cold?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
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
    initAudioContext().resume();
    if (feedback !== null) return;

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
    <div 
      className="h-full bg-blue-50 overflow-hidden flex flex-col p-4 md:p-8 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(currentItem.label); }}
    >
      <Confetti active={isVictory} />
      
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
        <div className="bg-blue-600/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-black text-blue-700 uppercase tracking-tight">
          {progress}/{GOAL}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 z-10">
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
            onClick={(e) => { e.stopPropagation(); speak(currentItem.label); }} 
            className="absolute -bottom-4 -right-4 bg-blue-500 p-4 rounded-full text-white shadow-xl hover:bg-blue-600 active:scale-125 transition-all"
          >
            <Volume2 size={24} className={isSpeaking ? 'animate-pulse' : ''} />
          </button>
        </motion.div>

        <div className="flex flex-col gap-4 w-full max-w-xs md:max-w-sm">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSelect('cold')}
            className="h-24 md:h-32 rounded-3xl bg-cyan-500 hover:bg-cyan-600 shadow-xl border-4 border-white flex items-center justify-center gap-4 transition-all"
          >
            <ThermometerSnowflake size={36} className="text-white md:scale-150" />
            <span className="text-white text-2xl md:text-4xl font-black uppercase tracking-wider">COLD</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSelect('hot')}
            className="h-24 md:h-32 rounded-3xl bg-orange-500 hover:bg-orange-600 shadow-xl border-4 border-white flex items-center justify-center gap-4 transition-all"
          >
            <ThermometerSun size={36} className="text-white md:scale-150" />
            <span className="text-white text-2xl md:text-4xl font-black uppercase tracking-wider">HOT</span>
          </motion.button>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border-8 border-cyan-400 flex flex-col items-center gap-8">
            <div className="text-8xl animate-bounce">🐧</div>
            <h2 className="text-3xl font-black text-blue-900 uppercase">Arctic Hero!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-cyan-600 text-white text-2xl font-black py-6 rounded-3xl">GREAT JOB!</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ArcticOpposites;
