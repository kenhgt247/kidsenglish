
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Rocket, Star } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const spaceSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'], volume: 0.3 });

const PHONICS_DATA = [
  { char: 'A', word: 'APPLE', icon: '🍎' },
  { char: 'B', word: 'BANANA', icon: '🍌' },
  { char: 'C', word: 'CAT', icon: '🐱' },
  { char: 'D', word: 'DOG', icon: '🐶' },
  { char: 'E', word: 'EGG', icon: '🥚' },
  { char: 'F', word: 'FISH', icon: '🐟' },
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

const SpacePhonics: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(PHONICS_DATA[0]);
  const [options, setOptions] = useState<string[]>([]);
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

  const speak = async (text: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Where is the letter for ${text}?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
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

  const nextRound = () => {
    const t = PHONICS_DATA[Math.floor(Math.random() * PHONICS_DATA.length)];
    setTarget(t);
    const opts = [t.char];
    while (opts.length < 3) {
      const randomChar = PHONICS_DATA[Math.floor(Math.random() * PHONICS_DATA.length)].char;
      if (!opts.includes(randomChar)) opts.push(randomChar);
    }
    setOptions(opts.sort(() => 0.5 - Math.random()));
    speak(t.word);
  };

  useEffect(() => { 
    spaceSfx.play();
    nextRound(); 
    return () => { spaceSfx.stop(); };
  }, []);

  const handleSelect = (char: string) => {
    initAudioContext().resume();
    if (char === target.char) {
      addScore(50);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= GOAL) {
        setIsVictory(true);
        unlockLevel(10);
      } else {
        nextRound();
      }
    }
  };

  return (
    <div 
      className="h-full bg-[#0F172A] overflow-hidden flex flex-col p-4 md:p-8 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(target.word); }}
    >
      <Confetti active={isVictory} />
      
      <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-black text-indigo-300 border border-white/10">
        🛸 SPACE: {progress}/{GOAL}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 w-full max-w-4xl mx-auto">
        <motion.div 
          key={target.char}
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 backdrop-blur-xl p-12 rounded-[4rem] border-4 border-white/10 flex flex-col items-center gap-6"
        >
          <div className="text-[12rem] md:text-[18rem] drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {target.icon}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); speak(target.word); }}
            className="flex items-center gap-4 bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-2xl md:text-4xl shadow-2xl active:scale-95 transition-all"
          >
            <Volume2 className={isSpeaking ? 'animate-pulse' : ''} size={40} />
            <span className="uppercase tracking-widest">{target.word}</span>
          </button>
        </motion.div>

        <div className="flex gap-6 md:gap-12">
          {options.map((char, i) => (
            <motion.button
              key={char + i}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSelect(char)}
              className="w-24 h-24 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 border-4 border-white/40 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center text-5xl md:text-8xl font-black text-white"
            >
              {char}
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-[#0F172A]/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-sm w-full border-8 border-indigo-400 flex flex-col items-center gap-8">
            <div className="relative">
              <Rocket size={80} className="text-indigo-600 animate-bounce" />
            </div>
            <h2 className="text-4xl font-black text-indigo-900 uppercase leading-none">Star Pilot!</h2>
            <button onClick={() => navigate('/map')} className="w-full bg-indigo-600 text-white text-3xl font-black py-6 rounded-3xl shadow-[0_12px_0_0_#4338CA] active:translate-y-1 transition-all">
              MAP <Rocket size={24} className="inline ml-2" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SpacePhonics;
