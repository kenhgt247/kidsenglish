import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const VERBS = [
  { id: 'run', label: 'RUN', icon: '🏃', motion: { x: [0, 50, 0] } },
  { id: 'jump', label: 'JUMP', icon: '🦘', motion: { y: [0, -50, 0] } },
  { id: 'fly', label: 'FLY', icon: '🕊️', motion: { y: [-20, 20, -20], x: [-10, 10, -10] } },
  { id: 'swim', label: 'SWIM', icon: '🏊', motion: { x: [-30, 30, -30] } },
];

const VerbRun: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(VERBS[0]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = async (txt: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Who is ${txt}ning?` }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const buffer = ctx.createBuffer(1, Math.floor(bytes.byteLength / 2), 24000);
        const channelData = buffer.getChannelData(0);
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < buffer.length; i++) channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else setIsSpeaking(false);
    } catch { setIsSpeaking(false); }
  };

  const nextRound = () => {
    const next = VERBS[Math.floor(Math.random() * VERBS.length)];
    setTarget(next);
    speak(next.label.toLowerCase());
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (id: string) => {
    if (id === target.id) {
      addScore(50);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(26); }
      else nextRound();
    }
  };

  return (
    <div className="h-full bg-sky-50 flex flex-col items-center justify-center p-8 relative overflow-hidden" onClick={() => !isSpeaking && speak(target.label.toLowerCase())}>
      <Confetti active={isVictory} />
      <div className="flex flex-col items-center gap-12 z-10 w-full max-w-4xl">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase text-center">Who is <span className="text-sky-600">{target.label}</span>?</h2>
        <div className="grid grid-cols-2 gap-8">
          {VERBS.map(v => (
            <motion.button key={v.id} animate={v.motion} transition={{ repeat: Infinity, duration: 1.5 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSelect(v.id); }} className={`w-36 h-36 md:w-56 md:h-56 rounded-[3rem] bg-white shadow-2xl flex items-center justify-center text-6xl md:text-8xl border-8 ${v.id === target.id ? 'border-sky-200' : 'border-transparent'}`}>
              {v.icon}
            </motion.button>
          ))}
        </div>
        <Volume2 size={48} className="text-sky-300 animate-pulse" />
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-slate-900/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-sky-400">
            <div className="text-8xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Action Hero!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-sky-600 text-white text-2xl font-black py-4 rounded-2xl">MAP</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VerbRun;