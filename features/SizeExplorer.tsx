
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const ITEMS = [
  { id: 'elephant', label: 'BIG', icon: '🐘', size: 'text-[12rem]' },
  { id: 'ant', label: 'SMALL', icon: '🐜', size: 'text-[4rem]' },
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

const SizeExplorer: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState<'BIG' | 'SMALL'>('BIG');
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

  const speak = async (txt: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Where is the ${txt} one?` }] }],
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

  const nextRound = () => {
    const next = Math.random() > 0.5 ? 'BIG' : 'SMALL';
    setTarget(next);
    speak(next);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (sel: string) => {
    initAudioContext().resume();
    if (sel === target) {
      addScore(80);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(22); }
      else nextRound();
    }
  };

  return (
    <div 
      className="h-full bg-indigo-50 flex flex-col items-center justify-center p-8 relative overflow-hidden"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(target); }}
    >
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 bg-indigo-600 text-white px-4 py-1 rounded-full font-black text-xs uppercase">Size Lab: {progress}/4</div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 w-full max-w-4xl">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase tracking-tighter text-center">
          Touch the <span className="text-indigo-600">{target}</span> one!
        </h2>

        <div className="flex items-center justify-center gap-20">
           {ITEMS.map(item => (
             <motion.button
               key={item.id}
               whileTap={{ scale: 0.8 }}
               onClick={() => handleSelect(item.label)}
               className={`flex items-center justify-center p-12 bg-white rounded-[4rem] shadow-2xl border-8 border-transparent hover:border-indigo-200 transition-all ${item.size}`}
             >
               {item.icon}
             </motion.button>
           ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-indigo-950/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-indigo-400">
            <div className="text-8xl mb-4">🐘</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Size Master!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-indigo-600 text-white text-2xl font-black py-4 rounded-2xl">FINAL STAGE</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SizeExplorer;
