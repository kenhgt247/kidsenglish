import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Rocket, ChevronRight } from 'lucide-react';
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

const SpacePhonics: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(PHONICS_DATA[0]);
  const [options, setOptions] = useState<string[]>([]);
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

  const speak = async (text: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Find the letter for ${text}, please!` }] }],
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

  const nextRound = () => {
    const t = PHONICS_DATA[Math.floor(Math.random() * PHONICS_DATA.length)];
    setTarget(t);
    let opts = [t.char];
    while (opts.length < 3) {
      const randomChar = PHONICS_DATA[Math.floor(Math.random() * PHONICS_DATA.length)].char;
      if (!opts.includes(randomChar)) opts.push(randomChar);
    }
    setOptions(opts.sort(() => 0.5 - Math.random()));
  };

  useEffect(() => { 
    spaceSfx.play();
    nextRound(); 
    return () => spaceSfx.stop();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => speak(target.word), 500);
    return () => clearTimeout(timer);
  }, [target]);

  const handleSelect = (char: string) => {
    initAudioContext().resume();
    if (char === target.char) {
      addScore(50);
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      if (nextProgress >= 5) {
        setIsVictory(true);
        unlockLevel(10);
      } else nextRound();
    }
  };

  return (
    <div className="h-full bg-[#0F172A] overflow-hidden flex flex-col p-8 relative" onClick={() => !isSpeaking && speak(target.word)}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full font-black text-indigo-300 border border-white/10">🛸 {progress}/5</div>
      <div className="flex-1 flex flex-col items-center justify-center gap-16 z-10 w-full max-w-4xl mx-auto">
        <motion.div key={target.char} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white/5 backdrop-blur-xl p-12 rounded-[4rem] border-4 border-white/10 flex flex-col items-center gap-6 shadow-2xl">
          <div className="text-[12rem] md:text-[18rem] drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none">{target.icon}</div>
          <button onClick={(e) => { e.stopPropagation(); speak(target.word); }} className="flex items-center gap-4 bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-2xl md:text-4xl shadow-2xl active:scale-110 transition-all">
            <Volume2 className={isSpeaking ? 'animate-pulse' : ''} size={44} />
            <span className="uppercase tracking-widest">{target.word}</span>
          </button>
        </motion.div>
        <div className="flex gap-8 md:gap-16">
          {options.map((char, i) => (
            <motion.button key={char + i} whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSelect(char); }} className="w-28 h-28 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 border-4 border-white/40 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center text-6xl md:text-8xl font-black text-white">{char}</motion.button>
          ))}
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-[#0F172A]/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-sm w-full border-8 border-indigo-400 flex flex-col items-center gap-8">
            <div className="relative"><Rocket size={100} className="text-indigo-600 animate-bounce" /></div>
            <h2 className="text-4xl font-black text-indigo-900 uppercase">Star Pilot!</h2>
            <button onClick={(e) => { e.stopPropagation(); navigate('/map'); }} className="w-full bg-indigo-600 text-white text-3xl font-black py-6 rounded-3xl shadow-[0_12px_0_0_#4338CA] active:translate-y-1 transition-all">ONWARD! <ChevronRight className="inline" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SpacePhonics;