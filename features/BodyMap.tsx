
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const BODY_PARTS = [
  { id: 'head', label: 'HEAD', pos: 'top-[10%] left-[45%]' },
  { id: 'hand', label: 'HAND', pos: 'top-[40%] left-[20%]' },
  { id: 'leg', label: 'LEG', pos: 'bottom-[15%] left-[50%]' },
  { id: 'tummy', label: 'TUMMY', pos: 'top-[50%] left-[45%]' },
];

const BodyMap: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [target, setTarget] = useState(BODY_PARTS[0]);
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
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const numSamples = Math.floor(bytes.byteLength / 2);
        const buffer = ctx.createBuffer(1, numSamples, 24000);
        const dataView = new DataView(bytes.buffer);
        const channelData = buffer.getChannelData(0);
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
    const next = BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)];
    setTarget(next);
    speak(next.label);
  };

  useEffect(() => { nextRound(); }, []);

  const handleTouch = (id: string) => {
    if (id === target.id) {
      addScore(50);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(25); }
      else nextRound();
    }
  };

  return (
    <div className="h-full bg-orange-50 flex flex-col items-center justify-center p-8 relative overflow-hidden" onClick={() => !isSpeaking && speak(target.label)}>
      <Confetti active={isVictory} />
      <div className="flex flex-col items-center gap-12 z-10 w-full max-w-4xl">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase text-center">Touch the <span className="text-orange-500">{target.label}</span>!</h2>
        <div className="relative w-full aspect-[3/4] max-h-[60vh] flex items-center justify-center bg-white/50 rounded-[4rem] border-4 border-white">
          <span className="text-[20rem] md:text-[30rem] select-none">🧒</span>
          {BODY_PARTS.map(p => (
            <motion.button key={p.id} whileTap={{ scale: 1.5 }} onClick={(e) => { e.stopPropagation(); handleTouch(p.id); }} className={`absolute w-32 h-32 rounded-full border-4 border-dashed border-orange-200 bg-orange-500/10 ${p.pos} flex items-center justify-center`}>
               <div className="w-4 h-4 bg-orange-500 rounded-full opacity-0" />
            </motion.button>
          ))}
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-slate-900/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-orange-400">
            <div className="text-8xl mb-4">🙌</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">My Body Expert!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-orange-500 text-white text-2xl font-black py-4 rounded-2xl">MAP</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BodyMap;
