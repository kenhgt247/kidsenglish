
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const BUGS = ['🐞', '🐝', '🐛', '🦋'];
const PREPOSITIONS = [
  { id: 'on', label: 'ON', visual: 'top-[-20%] left-[50%] -translate-x-1/2' },
  { id: 'under', label: 'UNDER', visual: 'bottom-[-20%] left-[50%] -translate-x-1/2' },
  { id: 'in', label: 'IN', visual: 'top-[40%] left-[50%] -translate-x-1/2 opacity-40' },
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

const PrepositionBugs: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [targetPrep, setTargetPrep] = useState(PREPOSITIONS[0]);
  const [currentBug, setCurrentBug] = useState(BUGS[0]);
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

  const speak = async (prep: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Find the bug ${prep} the leaf!` }] }],
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
    const p = PREPOSITIONS[Math.floor(Math.random() * PREPOSITIONS.length)];
    const b = BUGS[Math.floor(Math.random() * BUGS.length)];
    setTargetPrep(p);
    setCurrentBug(b);
    speak(p.label);
  };

  useEffect(() => { nextRound(); }, []);

  return (
    <div 
      className="h-full bg-emerald-50 flex flex-col items-center justify-center p-8 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(targetPrep.label); }}
    >
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 bg-emerald-600 text-white px-4 py-1 rounded-full font-black">BUGS: {progress}/5</div>

      <div className="flex-1 flex flex-col items-center justify-center gap-20">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase tracking-tighter text-center">
          Where is the bug <span className="text-emerald-500 underline">{targetPrep.label}</span>?
        </h2>

        <div className="relative w-full max-w-2xl flex justify-center gap-12">
          {PREPOSITIONS.map(p => (
            <div key={p.id} className="relative group cursor-pointer" onClick={() => {
              initAudioContext().resume();
              if (p.id === targetPrep.id) {
                addScore(50);
                const n = progress + 1;
                setProgress(n);
                if (n >= 5) { setIsVictory(true); unlockLevel(16); }
                else nextRound();
              }
            }}>
               <div className="w-32 h-48 md:w-48 md:h-64 bg-emerald-400 rounded-full rotate-[15deg] shadow-xl relative border-4 border-white">
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-emerald-600/30 -translate-x-1/2" />
                  <div className={`absolute text-6xl md:text-8xl ${p.visual}`}>{currentBug}</div>
               </div>
               <div className="mt-8 text-center text-2xl font-black text-emerald-800 uppercase">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-emerald-950/90 z-[150] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-emerald-400 text-center">
            <div className="text-8xl mb-4">🐞</div>
            <h2 className="text-3xl font-black text-emerald-900 uppercase">Bug Hunter!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-emerald-600 text-white text-2xl font-black py-4 rounded-2xl">CONTINUE</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PrepositionBugs;
