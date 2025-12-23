
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const TASKS = [
  { id: 'brush', label: 'BRUSH TEETH', icon: '🪥', sound: 'Brush your teeth!' },
  { id: 'wash', label: 'WASH FACE', icon: '🧼', sound: 'Wash your face!' },
  { id: 'sleep', label: 'GO TO SLEEP', icon: '🛌', sound: 'Time to sleep!' },
  { id: 'eat', label: 'EAT BREAKFAST', icon: '🥣', sound: 'Eat your breakfast!' },
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

const DailyRoutine: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(TASKS[0]);
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
        contents: [{ parts: [{ text: `Say cheerfully: ${txt}` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
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
    const next = TASKS[Math.floor(Math.random() * TASKS.length)];
    setTarget(next);
    speak(next.sound);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (id: string) => {
    initAudioContext().resume();
    if (id === target.id) {
      addScore(60);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(17); }
      else nextRound();
    }
  };

  return (
    <div 
      className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(target.sound); }}
    >
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 bg-slate-200 text-slate-600 px-4 py-1 rounded-full font-black text-xs">ROUTINE: {progress}/4</div>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10">
        <div className="text-center">
           <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase tracking-tighter mb-4">Helping Asking...</h2>
           <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[12rem] md:text-[16rem]">🦖</motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TASKS.map(task => (
            <motion.button
              key={task.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
              onClick={() => handleSelect(task.id)}
              className={`w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] bg-white shadow-xl flex flex-col items-center justify-center gap-2 border-4 transition-all ${task.id === target.id ? 'border-dino-green ring-8 ring-dino-green/20' : 'border-transparent opacity-60'}`}
            >
              <div className="text-5xl md:text-7xl">{task.icon}</div>
              <div className="text-[10px] md:text-xs font-black uppercase text-slate-400">{task.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-slate-900/90 z-[150] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-dino-green text-center">
            <div className="text-8xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">A Great Day!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-dino-green text-white text-2xl font-black py-4 rounded-2xl">CONTINUE</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DailyRoutine;
