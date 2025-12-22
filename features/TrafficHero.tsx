
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const TrafficHero: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [light, setLight] = useState<'red' | 'green'>('red');
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
        contents: [{ parts: [{ text: txt }] }],
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
    const next = Math.random() > 0.5 ? 'red' : 'green';
    setLight(next);
    speak(next === 'red' ? 'RED means STOP!' : 'GREEN means GO!');
  };

  useEffect(() => { nextRound(); }, []);

  const handleAction = (action: 'stop' | 'go') => {
    if ((action === 'stop' && light === 'red') || (action === 'go' && light === 'green')) {
      addScore(70);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(21); }
      else nextRound();
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 bg-white/20 text-white px-4 py-1 rounded-full font-black text-xs">Traffic Hero: {progress}/4</div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 w-full max-w-4xl">
        <div className="flex flex-col gap-4 bg-slate-800 p-6 rounded-[3rem] border-8 border-slate-700">
           <motion.div animate={{ opacity: light === 'red' ? 1 : 0.2 }} className="w-24 h-24 rounded-full bg-red-500 shadow-[0_0_30px_red]" />
           <motion.div animate={{ opacity: light === 'green' ? 1 : 0.2 }} className="w-24 h-24 rounded-full bg-green-500 shadow-[0_0_30px_green]" />
        </div>

        <div className="flex gap-8">
           <motion.button
             whileTap={{ scale: 0.9 }} onClick={() => handleAction('stop')}
             className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] bg-red-600 text-white text-3xl font-black shadow-[0_12px_0_0_#991B1B]"
           >
              STOP
           </motion.button>
           <motion.button
             whileTap={{ scale: 0.9 }} onClick={() => handleAction('go')}
             className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] bg-green-600 text-white text-3xl font-black shadow-[0_12px_0_0_#166534]"
           >
              GO
           </motion.button>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-slate-950/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-dino-green">
            <div className="text-8xl mb-4">🚦</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Safe Driver!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-dino-green text-white text-2xl font-black py-4 rounded-2xl">NEXT LEVEL</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TrafficHero;
