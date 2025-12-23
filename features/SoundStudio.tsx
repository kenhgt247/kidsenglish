
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Music } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const INSTRUMENTS = [
  { id: 'piano', label: 'PIANO', icon: '🎹' },
  { id: 'guitar', label: 'GUITAR', icon: '🎸' },
  { id: 'drums', label: 'DRUMS', icon: '🥁' },
  { id: 'trumpet', label: 'TRUMPET', icon: '🎺' },
];

const SoundStudio: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(INSTRUMENTS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const speak = async (txt: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Where is the ${txt}?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a warm, clear British English teacher for toddlers. Use a friendly UK accent. Speak slowly and clearly.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = audioContextRef.current || new AudioContextClass({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const numSamples = Math.floor(bytes.byteLength / 2);
        const buffer = ctx.createBuffer(1, numSamples, 24000);
        const channelData = buffer.getChannelData(0);
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < numSamples; i++) channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else setIsSpeaking(false);
    } catch { setIsSpeaking(false); }
  };

  const nextRound = () => {
    const next = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];
    setTarget(next);
    speak(next.label);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (id: string) => {
    if (id === target.id) {
      addScore(50);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(23); }
      else nextRound();
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden" onClick={() => !isSpeaking && speak(target.label)}>
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 bg-white/20 text-white px-4 py-1 rounded-full font-black">MUSIC: {progress}/4</div>
      <div className="flex flex-col items-center gap-12 z-10">
        <h2 className="text-4xl md:text-6xl font-black text-white uppercase text-center">Touch the <span className="text-emerald-400">{target.label}</span>!</h2>
        <div className="grid grid-cols-2 gap-8">
          {INSTRUMENTS.map(item => (
            <motion.button key={item.id} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSelect(item.id); }} className="w-32 h-32 md:w-56 md:h-56 rounded-[3rem] bg-white shadow-2xl flex items-center justify-center text-6xl md:text-8xl border-8 border-transparent active:border-emerald-400 transition-all">
              {item.icon}
            </motion.button>
          ))}
        </div>
        <button className="bg-white/10 p-6 rounded-full text-white animate-pulse"><Volume2 size={48} /></button>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-slate-950/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-emerald-400">
            <Music size={80} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-slate-800 uppercase">Rock Star!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-emerald-500 text-white text-2xl font-black py-4 rounded-2xl">MAP</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SoundStudio;
