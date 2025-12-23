
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Sun, CloudRain, Snowflake } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const WEATHER_TYPES = [
  { id: 'sunny', label: 'SUNNY', icon: <Sun size={80} className="text-yellow-400" />, prompt: "It is sunny!", items: ['🕶️', '🧢', '🍦'], target: '🕶️' },
  { id: 'rainy', label: 'RAINY', icon: <CloudRain size={80} className="text-sky-400" />, prompt: "It is rainy!", items: ['☂️', 'BOOTS', 'SCARF'], target: '☂️' },
  { id: 'snowy', label: 'SNOWY', icon: <Snowflake size={80} className="text-blue-200" />, prompt: "It is snowy!", items: ['🧤', 'SUNGLASSES', 'FLIP FLOPS'], target: '🧤' },
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

const WeatherWatch: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [current, setCurrent] = useState(WEATHER_TYPES[0]);
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
        contents: [{ parts: [{ text: `${txt} What do we need?` }] }],
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
    const next = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    setCurrent(next);
    speak(next.prompt);
  };

  useEffect(() => { nextRound(); }, []);

  const handleSelect = (item: string) => {
    initAudioContext().resume();
    if (item === current.target) {
      addScore(50);
      const n = progress + 1;
      setProgress(n);
      if (n >= 5) { setIsVictory(true); unlockLevel(15); }
      else nextRound();
    }
  };

  return (
    <div 
      className="h-full bg-sky-100 flex flex-col items-center justify-center p-8 relative"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(current.prompt); }}
    >
      <Confetti active={isVictory} />
      <div className="absolute top-4 left-4 z-10 bg-white/50 px-4 py-1 rounded-full text-sky-700 font-black">WEATHER: {progress}/5</div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <motion.div key={current.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center gap-6 border-8 border-white">
          {current.icon}
          <div className="text-4xl md:text-6xl font-black text-slate-800 uppercase tracking-tighter">{current.label}</div>
          <button onClick={(e) => { e.stopPropagation(); speak(current.prompt); }} className="p-4 bg-sky-100 rounded-full text-sky-600">
            <Volume2 size={32} className={isSpeaking ? 'animate-pulse' : ''} />
          </button>
        </motion.div>

        <div className="flex gap-6">
          {current.items.map((item, i) => (
            <motion.button
              key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSelect(item)}
              className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl text-6xl shadow-xl flex items-center justify-center border-4 border-transparent active:border-sky-400 transition-all font-black text-xs"
            >
              <div className="flex flex-col items-center">
                <span>{item.length === 1 ? item : '🎁'}</span>
                {item.length > 1 && <span className="text-[10px]">{item}</span>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-sky-900/90 z-[150] flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] border-8 border-sky-400">
            <div className="text-8xl mb-4">🌦️</div>
            <h2 className="text-3xl font-black text-sky-900 uppercase">Weather Expert!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-sky-600 text-white text-2xl font-black py-4 rounded-2xl">CONTINUE</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WeatherWatch;
