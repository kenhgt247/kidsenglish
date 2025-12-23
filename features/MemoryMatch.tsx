
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext.tsx';
import Confetti from '../components/Confetti.tsx';

const CARDS = [
  { id: 1, type: 'A', icon: '🍎' }, { id: 2, type: 'A', icon: '🍎' },
  { id: 3, type: 'B', icon: '🍌' }, { id: 4, type: 'B', icon: '🍌' },
  { id: 5, type: 'C', icon: '🍰' }, { id: 6, type: 'C', icon: '🍰' },
  { id: 7, type: 'D', icon: '🥦' }, { id: 8, type: 'D', icon: '🥦' },
];

const MemoryMatch: React.FC = () => {
  const navigate = useNavigate();
  const { addScore, unlockLevel } = useGame();
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [isVictory, setIsVictory] = useState(false);

  useEffect(() => {
    setCards([...CARDS].sort(() => 0.5 - Math.random()));
  }, []);

  const handleFlip = (id: number) => {
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
          unlockLevel(25);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="h-full bg-emerald-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Confetti active={isVictory} />
      <h2 className="text-4xl md:text-6xl font-black text-slate-800 uppercase mb-8">Dino Memory</h2>
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
            <div className="text-8xl mb-4">🧠</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">Super Mind!</h2>
            <button onClick={() => navigate('/map')} className="w-full mt-6 bg-emerald-500 text-white text-2xl font-black py-4 rounded-2xl">MAP</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MemoryMatch;
