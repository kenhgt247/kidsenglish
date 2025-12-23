
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Plus, Equal } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const popSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.6 });

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

const MagicMath: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [num1, setNum1] = useState(1);
  const [num2, setNum2] = useState(1);
  const [options, setOptions] = useState<number[]>([]);
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

  const speak = async (n1: number, n2: number) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `What is ${n1} plus ${n2}?` }] }],
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
    const n1 = Math.floor(Math.random() * 3) + 1;
    const n2 = Math.floor(Math.random() * 3) + 1;
    const answer = n1 + n2;
    setNum1(n1);
    setNum2(n2);
    
    let opts = new Set([answer]);
    while(opts.size < 3) opts.add(Math.floor(Math.random() * 6) + 1);
    setOptions(Array.from(opts).sort((a, b) => a - b));
    speak(n1, n2);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (val: number) => {
    initAudioContext().resume();
    if (val === num1 + num2) {
      popSfx.play();
      addScore(50);
      const n = progress + 1;
      setProgress(n);
      if (n >= GOAL) { setIsVictory(true); unlockLevel(14); }
      else nextRound();
    }
  };

  return (
    <div 
      className="h-full bg-[#0F172A] flex flex-col items-center justify-center p-8 relative overflow-hidden"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(num1, num2); }}
    >
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-white/10 px-4 py-1 rounded-full text-indigo-300 font-black">MATH: {progress}/{GOAL}</div>

      <div className="flex flex-col items-center gap-12 z-10">
        <div className="flex items-center gap-6 md:gap-12 text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
               {Array.from({length: num1}).map((_, i) => <span key={i} className="text-4xl md:text-6xl">🦖</span>)}
            </div>
            <div className="text-5xl md:text-7xl font-black">{num1}</div>
          </div>

          <Plus size={48} className="text-indigo-400" />

          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
               {Array.from({length: num2}).map((_, i) => <span key={i} className="text-4xl md:text-6xl">🦕</span>)}
            </div>
            <div className="text-5xl md:text-7xl font-black">{num2}</div>
          </div>

          <Equal size={48} className="text-indigo-400" />
          <div className="w-24 h-24 md:w-32 md:h-32 border-4 border-dashed border-indigo-500 rounded-3xl flex items-center justify-center text-5xl md:text-7xl font-black text-indigo-300">?</div>
        </div>

        <div className="flex gap-6">
          {options.map(opt => (
            <motion.button
              key={opt} whileTap={{ scale: 0.9 }} onClick={() => handleSelect(opt)}
              className="w-24 h-24 md:w-32 md:h-32 bg-indigo-600 text-white rounded-[2rem] text-4xl md:text-6xl font-black shadow-[0_12px_0_0_#4338CA] border-4 border-white/20 active:translate-y-2 active:shadow-none transition-all"
            >
              {opt}
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-indigo-950/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-indigo-400 max-w-sm w-full">
            <div className="text-8xl mb-4">🧮</div>
            <h2 className="text-3xl font-black text-indigo-900 uppercase">Math Whiz!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-indigo-600 text-white text-2xl font-black py-4 rounded-2xl">NEXT LEVEL</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MagicMath;
