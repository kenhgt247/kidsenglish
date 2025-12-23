
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Volume2, Heart, Star } from 'lucide-react';
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

const DinoFinale: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
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

  const speak = async () => {
    if (isSpeaking || !process.env.API_KEY) return;
    try {
      setIsSpeaking(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Congratulations! You have finished the Dino English Adventure! You are a superstar! Your total score is ${state.score}.` }] }],
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
      const base64Audio = audioPart?.inlineData?.data;
      if (base64Audio) {
         const ctx = initAudioContext();
         if (ctx.state === 'suspended') await ctx.resume();
         const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
         const source = ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(ctx.destination);
         source.onended = () => setIsSpeaking(false);
         source.start();
      } else { setIsSpeaking(false); }
    } catch { setIsSpeaking(false); }
  };

  useEffect(() => { 
    setIsVictory(true);
    setTimeout(speak, 1000); 
  }, []);

  return (
    <div 
      className="h-full bg-gradient-to-b from-sky-400 to-indigo-600 flex flex-col items-center justify-center p-8 relative overflow-hidden"
      onClick={() => { if(!isSpeaking) speak(); }}
    >
      <Confetti active={isVictory} />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10 w-full max-w-4xl text-center">
        <motion.div animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="text-[15rem] md:text-[20rem] drop-shadow-2xl">🦖</motion.div>
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[4rem] shadow-2xl border-8 border-white flex flex-col items-center gap-6">
           <h1 className="text-5xl md:text-8xl font-black text-indigo-900 leading-none">THE END</h1>
           <div className="flex items-center gap-3 bg-yellow-400 text-white px-8 py-4 rounded-3xl text-3xl font-black shadow-xl">
              <Star fill="currentColor" size={40} />
              <span>{state.score}</span>
           </div>
           <button onClick={() => navigate('/')} className="w-full bg-indigo-600 text-white text-3xl font-black py-8 rounded-[2.5rem] shadow-[0_12px_0_0_#3730A3] hover:translate-y-1 transition-all uppercase">PLAY AGAIN!</button>
        </div>
      </div>
    </div>
  );
};

export default DinoFinale;
