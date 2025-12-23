
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Equal, Beaker } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const MIXES = [
  { c1: 'RED', c1h: '#EF4444', c2: 'BLUE', c2h: '#3B82F6', res: 'PURPLE', resh: '#A855F7' },
  { c1: 'RED', c1h: '#EF4444', c2: 'YELLOW', c2h: '#FACC15', res: 'ORANGE', resh: '#FB923C' },
  { c1: 'BLUE', c1h: '#3B82F6', c2: 'YELLOW', c2h: '#FACC15', res: 'GREEN', resh: '#4ADE80' },
];

const ColorLab: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [current, setCurrent] = useState(MIXES[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = async (c1: string, c2: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `What color do we get from ${c1} and ${c2}?` }] }],
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
        const dataView = new DataView(bytes.buffer);
        const channelData = buffer.getChannelData(0);
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
    const next = MIXES[Math.floor(Math.random() * MIXES.length)];
    setCurrent(next);
    const opts = [next.res, 'PINK', 'BROWN'].sort(() => 0.5 - Math.random());
    setOptions(opts);
    speak(next.c1, next.c2);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (color: string) => {
    if (color === current.res) {
      addScore(100);
      const n = progress + 1;
      setProgress(n);
      if (n >= 3) { setIsVictory(true); unlockLevel(1); } // Quay lại 1 hoặc kết thúc
      else nextRound();
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden" onClick={() => !isSpeaking && speak(current.c1, current.c2)}>
      <Confetti active={isVictory} />
      <div className="flex flex-col items-center gap-12 z-10 w-full max-w-4xl">
        <h2 className="text-4xl md:text-6xl font-black text-white uppercase text-center">Color Lab 🧪</h2>
        <div className="flex items-center gap-6 md:gap-12">
           <div className="w-24 h-32 md:w-36 md:h-48 rounded-b-full border-4 border-white shadow-2xl relative" style={{ backgroundColor: current.c1h }} />
           <Plus size={48} className="text-white" />
           <div className="w-24 h-32 md:w-36 md:h-48 rounded-b-full border-4 border-white shadow-2xl relative" style={{ backgroundColor: current.c2h }} />
           <Equal size={48} className="text-white" />
           <div className="w-24 h-32 md:w-36 md:h-48 rounded-b-full border-4 border-dashed border-white flex items-center justify-center text-4xl text-white">?</div>
        </div>
        <div className="flex gap-4">
          {options.map(opt => (
            <motion.button key={opt} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSelect(opt); }} className="px-8 py-4 bg-white rounded-2xl font-black text-xl md:text-3xl shadow-xl uppercase">
              {opt}
            </motion.button>
          ))}
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-slate-950/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-indigo-400">
            <Beaker size={80} className="text-indigo-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-slate-800 uppercase">Master Scientist!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-indigo-600 text-white text-2xl font-black py-4 rounded-2xl">MAP</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ColorLab;
