
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';
import { Volume2, Brain } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

const CARDS = [
  { id: 1, type: 'A', icon: '🍎' }, { id: 2, type: 'A', icon: '🍎' },
  { id: 3, type: 'B', icon: '🍌' }, { id: 4, type: 'B', icon: '🍌' },
  { id: 5, type: 'C', icon: '🍰' }, { id: 6, type: 'C', icon: '🍰' },
  { id: 7, type: 'D', icon: '🥦' }, { id: 8, type: 'D', icon: '🥦' },
];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer | null> {
  const numSamples = Math.floor(data.byteLength / 2);
  const frameCount = Math.floor(numSamples / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      const sampleIndex = (i * numChannels + channel) * 2;
      if (sampleIndex + 1 < data.byteLength) {
        const sample = dataView.getInt16(sampleIndex, true);
        channelData[i] = sample / 32768.0;
      }
    }
  }
  return buffer;
}

const MemoryMatch: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
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

  const speak = async (text: string) => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a warm, clear British English teacher for toddlers. Use a friendly UK accent. Speak slowly and clearly.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        },
      });
      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
      if (audioPart?.inlineData?.data) {
        const ctx = initAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const buffer = await decodeAudioData(decodeBase64(audioPart.inlineData.data), ctx, 24000, 1);
        if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.onended = () => setIsSpeaking(false);
          source.start();
        } else { setIsSpeaking(false); }
      } else { setIsSpeaking(false); }
    } catch (e) { setIsSpeaking(false); }
  };

  useEffect(() => {
    setCards([...CARDS].sort(() => 0.5 - Math.random()));
    const timer = setTimeout(() => speak("Find the matching cards!"), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleFlip = (id: number) => {
    initAudioContext().resume();
    if (flipped.length === 2 || matched.includes(id) || flipped.includes(id)) return;
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const first = cards.find(c => c.id === newFlipped[0]);
      const second = cards.find(c => c.id === newFlipped[1]);
      if (first.type === second.type) {
        setMatched([...matched, newFlipped[0], newFlipped[1]]);
        setFlipped([]);
        addScore(50);
        if (matched.length + 2 === cards.length) {
          setIsVictory(true);
          unlockLevel(24);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="h-full bg-emerald-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Confetti active={isVictory} />
      <div className="flex flex-col items-center gap-6 mb-8">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase text-center">Dino Memory</h2>
        <button onClick={() => speak("Find the pairs!")} className="bg-white p-4 rounded-full shadow-xl border-4 border-emerald-200 active:scale-95 transition-all">
          <Volume2 className={isSpeaking ? "text-emerald-500 animate-pulse" : "text-slate-300"} size={32} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4 md:gap-8">
        {cards.map(card => (
          <motion.div key={card.id} whileTap={{ scale: 0.9 }} onClick={() => handleFlip(card.id)} className={`w-20 h-24 md:w-32 md:h-44 rounded-2xl md:rounded-3xl cursor-pointer flex items-center justify-center text-5xl md:text-7xl shadow-xl transition-all border-4 ${flipped.includes(card.id) || matched.includes(card.id) ? 'bg-white border-emerald-400 rotate-y-180' : 'bg-emerald-500 border-white'}`}>
            {(flipped.includes(card.id) || matched.includes(card.id)) ? card.icon : '❓'}
          </motion.div>
        ))}
      </div>
      {isVictory && (
        <div className="fixed inset-0 bg-slate-900/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-emerald-400">
            <Brain size={80} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-slate-800 uppercase">Super Mind!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-emerald-500 text-white text-2xl font-black py-4 rounded-2xl">MAP</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MemoryMatch;
