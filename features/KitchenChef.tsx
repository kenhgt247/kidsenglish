
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const KITCHEN_ITEMS = [
  { id: 'spoon', label: 'SPOON', icon: '🥄' },
  { id: 'plate', label: 'PLATE', icon: '🍽️' },
  { id: 'pot', label: 'POT', icon: '🍲' },
  { id: 'cup', label: 'CUP', icon: '🥛' },
];

const KitchenChef: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(KITCHEN_ITEMS[0]);
  const [options, setOptions] = useState(KITCHEN_ITEMS);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const speak = async (txt: string) => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Where is the ${txt}?` }] }],
        config: { responseModalities: [Modality.AUDIO] }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         const ctx = audioContextRef.current || new AudioContext({ sampleRate: 24000 });
         audioContextRef.current = ctx;
         const binary = atob(base64);
         const bytes = new Uint8Array(binary.length);
         for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
         const dataInt16 = new Int16Array(bytes.buffer);
         const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
         const channelData = buffer.getChannelData(0);
         for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
         const source = ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(ctx.destination);
         source.onended = () => setIsSpeaking(false);
         source.start();
      } else { setIsSpeaking(false); }
    } catch { setIsSpeaking(false); }
  };

  const nextRound = () => {
    const next = KITCHEN_ITEMS[Math.floor(Math.random() * KITCHEN_ITEMS.length)];
    setTarget(next);
    setOptions([...KITCHEN_ITEMS].sort(() => 0.5 - Math.random()));
    speak(next.label);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (id: string) => {
    if (id === target.id) {
      addScore(60);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(20); }
      else nextRound();
    }
  };

  return (
    <div className="h-full bg-orange-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 bg-orange-600 text-white px-4 py-1 rounded-full font-black text-xs uppercase">Chef Progress: {progress}/4</div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 w-full max-w-4xl">
        <div className="text-center">
          <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase tracking-tighter mb-4">Little Chef</h2>
          <div className="text-8xl md:text-9xl">👨‍🍳</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {options.map(item => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSelect(item.id)}
              className={`w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] bg-white shadow-xl flex flex-col items-center justify-center gap-2 border-4 transition-all ${item.id === target.id ? 'border-orange-500 ring-8 ring-orange-500/20' : 'border-transparent opacity-60'}`}
            >
              <div className="text-5xl md:text-7xl">{item.icon}</div>
              <div className="text-[10px] md:text-xs font-black uppercase text-slate-400">{item.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-orange-950/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-orange-400">
            <div className="text-8xl mb-4">🥘</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Master Chef!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-orange-600 text-white text-2xl font-black py-4 rounded-2xl">NEXT LEVEL</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default KitchenChef;
