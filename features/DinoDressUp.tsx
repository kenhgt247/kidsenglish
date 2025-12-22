
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, CheckCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Howl } from 'howler';

const dressSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.5 });
const cheerSfx = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 });

const CLOTHING = [
  { id: 'hat', label: 'HAT', icon: '👒', targetPos: { top: '5%', left: '35%' } },
  { id: 'crown', label: 'CROWN', icon: '👑', targetPos: { top: '2%', left: '55%' } },
  { id: 'glasses', label: 'GLASSES', icon: '🕶️', targetPos: { top: '32%', left: '35%' } },
  { id: 'scarf', label: 'SCARF', icon: '🧣', targetPos: { top: '48%', left: '35%' } },
  { id: 'shirt', label: 'SHIRT', icon: '👕', targetPos: { top: '65%', left: '35%' } },
  { id: 'gloves', label: 'GLOVES', icon: '🧤', targetPos: { top: '68%', left: '15%' } },
  { id: 'shoes', label: 'SHOES', icon: '👟', targetPos: { top: '88%', left: '35%' } },
];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
  const frameCount = Math.floor(dataInt16.length / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const DinoDressUp: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [currentTarget, setCurrentTarget] = useState(CLOTHING[0]);
  const [dressedItems, setDressedItems] = useState<string[]>([]);
  const [isVictory, setIsVictory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dinoContainerRef = useRef<HTMLDivElement>(null);

  const speak = async (itemName: string) => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Can you help me put on my ${itemName}?` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
         if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
         const ctx = audioContextRef.current;
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

  useEffect(() => {
    if (!isVictory) speak(currentTarget.label.toLowerCase());
  }, [currentTarget]);

  const handleDragEnd = (event: any, info: any, item: any) => {
    if (item.id !== currentTarget.id) return;
    const dinoRect = dinoContainerRef.current?.getBoundingClientRect();
    if (!dinoRect) return;
    const threshold = 120;
    const dinoCenterX = dinoRect.left + dinoRect.width / 2;
    const dinoCenterY = dinoRect.top + dinoRect.height / 2;
    const distance = Math.sqrt(Math.pow(info.point.x - dinoCenterX, 2) + Math.pow(info.point.y - dinoCenterY, 2));

    if (distance < threshold) {
      dressSfx.play();
      addScore(75);
      setDressedItems(prev => [...prev, item.id]);
      const nextIndex = CLOTHING.findIndex(c => c.id === item.id) + 1;
      if (nextIndex < CLOTHING.length) {
        setCurrentTarget(CLOTHING[nextIndex]);
      } else {
        setIsVictory(true);
        cheerSfx.play();
        unlockLevel(13);
      }
    }
  };

  return (
    <div className="h-full bg-slate-100 overflow-hidden flex flex-col p-4 md:p-8 relative">
      <Confetti active={isVictory} />
      <div className="flex-1 flex flex-row items-center justify-around z-10 gap-4">
        <div className="bg-white/50 backdrop-blur-md p-4 md:p-6 rounded-[3rem] border-4 border-white shadow-xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto no-scrollbar">
          <h3 className="text-center font-black text-slate-400 uppercase tracking-widest text-[10px] md:text-sm">Closet</h3>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {CLOTHING.map(item => {
              const isDressed = dressedItems.includes(item.id);
              const isCurrent = item.id === currentTarget.id;
              return (
                <motion.div
                  key={item.id}
                  drag={!isDressed && isCurrent}
                  dragSnapToOrigin
                  onDragEnd={(e, info) => handleDragEnd(e, info, item)}
                  whileHover={!isDressed && isCurrent ? { scale: 1.1 } : {}}
                  whileTap={!isDressed && isCurrent ? { scale: 0.9, rotate: 5 } : {}}
                  className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-5xl shadow-lg border-2 md:border-4 transition-all
                    ${isDressed ? 'bg-slate-200 opacity-30 border-slate-300' : isCurrent ? 'bg-white border-sky-400 cursor-grab active:cursor-grabbing' : 'bg-white opacity-40 border-transparent'}`}
                >
                  {isDressed ? <CheckCircle className="text-emerald-500" size={32} /> : item.icon}
                </motion.div>
              );
            })}
          </div>
        </div>
        <div className="relative flex-1 flex flex-col items-center gap-4 md:gap-8">
          <motion.button onClick={() => speak(currentTarget.label.toLowerCase())} className="bg-sky-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-black text-lg md:text-2xl shadow-xl flex items-center gap-4 active:scale-95 transition-all z-20">
            <Volume2 className={isSpeaking ? 'animate-bounce' : ''} size={28} />
            PUT ON THE {currentTarget.label}!
          </motion.button>
          <div ref={dinoContainerRef} className="relative w-64 h-64 md:w-[450px] md:h-[450px] bg-dino-green rounded-[4rem] md:rounded-[6rem] flex items-center justify-center border-[8px] md:border-[12px] border-white shadow-2xl overflow-hidden">
            <span className="text-[10rem] md:text-[18rem] select-none">🦖</span>
            <AnimatePresence>
              {CLOTHING.map(item => dressedItems.includes(item.id) && (
                <motion.div key={`dressed-${item.id}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.4, opacity: 1 }} className="absolute z-20 pointer-events-none drop-shadow-2xl" style={item.targetPos}>
                  <span className="text-5xl md:text-7xl">{item.icon}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[5rem] shadow-2xl max-w-sm w-full border-[12px] border-emerald-400 flex flex-col items-center gap-8">
             <div className="text-9xl animate-spin-slow">🕶️</div>
             <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Super Stylish!</h2>
             <button onClick={() => navigate('/map')} className="w-full bg-emerald-500 text-white text-3xl font-black py-6 rounded-[2.5rem] shadow-[0_12px_0_0_#059669] active:translate-y-1 transition-all">AWESOME!</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DinoDressUp;
