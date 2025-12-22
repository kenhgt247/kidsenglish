
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ConfettiPiece = ({ color, x, y, delay }: { color: string, x: number, y: number, delay: number }) => (
  <motion.div
    initial={{ x, y: -20, opacity: 1, rotate: 0 }}
    animate={{ 
      y: window.innerHeight, 
      rotate: 720,
      opacity: [1, 1, 0]
    }}
    transition={{ 
      duration: 2 + Math.random() * 2, 
      delay, 
      ease: "easeOut"
    }}
    className="fixed w-3 h-3 z-[100]"
    style={{ backgroundColor: color, borderRadius: Math.random() > 0.5 ? '50%' : '20%' }}
  />
);

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  const [pieces, setPieces] = useState<any[]>([]);
  const colors = ['#4ADE80', '#FB923C', '#FACC15', '#60A5FA', '#F87171'];

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * window.innerWidth,
        delay: Math.random() * 0.5
      }));
      setPieces(newPieces);
      const timer = setTimeout(() => setPieces([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <>
      {pieces.map(p => (
        <ConfettiPiece key={p.id} {...p} y={-20} />
      ))}
    </>
  );
};

export default Confetti;
