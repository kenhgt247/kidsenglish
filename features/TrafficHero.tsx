
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

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

const TrafficHero: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [light, setLight] = useState<'red' | 'green'>('red');
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
        contents: [{ parts: [{ text: txt }] }],
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
    const next = Math.random() > 0.5 ? 'red' : 'green';
    setLight(next);
    speak(next === 'red' ? 'RED means STOP!' : 'GREEN means GO!');
  };

  useEffect(() => { nextRound(); }, []);

  const handleAction = (action: 'stop' | 'go') => {
    initAudioContext().resume();
    if ((action === 'stop' && light === 'red') || (action === 'go' && light === 'green')) {
      addScore(70);
      const n = progress + 1;
      setProgress(n);
      if (n >= 4) { setIsVictory(true); unlockLevel(21); }
      else nextRound();
    }
  };

  return (
    <div 
      className="h-full bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden"
      onClick={() => { if(progress === 0 && !isSpeaking) speak(light === 'red' ? 'RED STOP' : 'GREEN GO'); }}
    >
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
