
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const waterSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'], volume: 0.5 });
const winSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });
const correctSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.5 });

const VERBS = [
  { id: 'swim', label: 'SWIM', emoji: '🏊‍♂️', action: 'animate-bounce' },
  { id: 'jump', label: 'JUMP', emoji: '🐬', action: 'animate-bounce' },
  { id: 'sleep', label: 'SLEEP', emoji: '💤', action: 'animate-pulse' },
  { id: 'dance', label: 'DANCE', emoji: '🐙', action: 'animate-spin' },
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

const OceanVerbs: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(VERBS[0]);
  const [options, setOptions] = useState<any[]>([]);
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

  const speak = async (verb: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Can you find who is ${verb}ing?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a warm, clear British English teacher for toddlers. Use a friendly UK accent. Speak slowly and clearly.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
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
      } else { setIsSpeaking(false); }
    } catch { setIsSpeaking(false); }
  };

  const nextRound = () => {
    const next = VERBS[Math.floor(Math.random() * VERBS.length)];
    setTarget(next);
    setOptions([...VERBS].sort(() => 0.5 - Math.random()));
    speak(next.label.toLowerCase());
  };

  useEffect(() => { nextRound(); }, []);

  const handleChoice = (id: string) => {
    initAudioContext().resume();
    if (id === target.id) {
      correctSfx.play();
      addScore(40);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        winSfx.play();
        unlockLevel(9);
      } else { 
        waterSfx.play();
        nextRound(); 
      }
    }
  };

  return (
    <div 
      className="h-full bg-gradient-to-b from-sky-400 to-blue-700 overflow-hidden flex flex-col p-4 md:p-8 relative"
      onClick={() => initAudioContext().resume()}
    >
      <Confetti active={isVictory} />
      
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black text-white border border-white/30">
          🌊 {progress}/{GOAL}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 z-10">
        <motion.div
          key={target.id}
          className="relative flex flex-col items-center shrink-0"
        >
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className={`text-8xl md:text-[12rem] mb-6 md:mb-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${target.action}`}
          >
            {target.emoji}
          </motion.div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); speak(target.label.toLowerCase()); }}
            className="flex items-center gap-3 bg-white/10 backdrop-blur-md border-2 border-white/30 px-8 py-4 rounded-3xl active:scale-110 transition-transform"
          >
            <Volume2 className={isSpeaking ? 'text-white animate-pulse' : 'text-sky-200'} size={28} />
            <span className="text-white text-xl md:text-3xl font-black uppercase tracking-widest">WHO IS {target.label}?</span>
          </button>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm md:max-w-md">
          {options.map(opt => (
            <motion.button
              key={opt.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChoice(opt.id)}
              className={`
                h-20 md:h-28 rounded-[2rem] font-black text-xl md:text-3xl shadow-2xl border-4 transition-all uppercase
                ${opt.id === target.id ? 'bg-white text-blue-700 border-white' : 'bg-blue-600/40 text-blue-100 border-blue-400/30 backdrop-blur-sm'}
              `}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[4rem] text-center shadow-2xl max-w-sm w-full border-8 border-sky-400 flex flex-col items-center gap-8">
            <div className="text-8xl">🐳</div>
            <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter">Ocean Expert!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-blue-600 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_10px_0_0_#1E40AF] hover:translate-y-1 transition-all">
              CONTINUE <ChevronRight className="inline" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OceanVerbs;
