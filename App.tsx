
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home as HomeIcon, Map as MapIcon, Menu, X, Key } from 'lucide-react';
import { GameProvider } from './GameContext.tsx';

// Features Import
import Home from './features/Home.tsx';
import Map from './features/Map.tsx';
import FeedTheDino from './features/FeedTheDino.tsx';
import WordJungle from './features/WordJungle.tsx';
import AlphaVolcano from './features/AlphaVolcano.tsx';
import BubblePop from './features/BubblePop.tsx';
import EggCounter from './features/EggCounter.tsx';
import ShapeDesert from './features/ShapeDesert.tsx';
import ArcticOpposites from './features/ArcticOpposites.tsx';
import OceanVerbs from './features/OceanVerbs.tsx';
import SpacePhonics from './features/SpacePhonics.tsx';
import FarmFeelings from './features/FarmFeelings.tsx';
import RainbowColors from './features/RainbowColors.tsx';
import DinoDressUp from './features/DinoDressUp.tsx';
import MagicMath from './features/MagicMath.tsx';
import WeatherWatch from './features/WeatherWatch.tsx';
import PrepositionBugs from './features/PrepositionBugs.tsx';
import DailyRoutine from './features/DailyRoutine.tsx';
import PluralFruits from './features/PluralFruits.tsx';
import PetParlor from './features/PetParlor.tsx';
import KitchenChef from './features/KitchenChef.tsx';
import TrafficHero from './features/TrafficHero.tsx';
import SizeExplorer from './features/SizeExplorer.tsx';
import DinoFinale from './features/DinoFinale.tsx';

const Navigation = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  const checkKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  useEffect(() => {
    checkKey();
  }, [location.pathname]);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setIsOpen(false);
    }
  };

  // Chỉ hiển thị Navigation khi KHÔNG ở màn hình Home
  if (location.pathname === '/') return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="flex flex-col gap-3 mb-3 pointer-events-auto"
          >
            <button 
              onClick={handleSelectKey}
              className={`w-14 h-14 rounded-full shadow-2xl border-4 flex items-center justify-center transition-all active:scale-90 ${hasKey ? 'bg-indigo-500 border-indigo-100 text-white' : 'bg-rose-500 border-rose-100 text-white animate-pulse'}`}
            >
              <Key size={24} />
            </button>
            <Link to="/" onClick={() => setIsOpen(false)} className="w-14 h-14 bg-white rounded-full shadow-2xl border-4 border-sky-100 text-sky-500 flex items-center justify-center">
              <HomeIcon size={24} />
            </Link>
            <Link to="/map" onClick={() => setIsOpen(false)} className="w-14 h-14 bg-white rounded-full shadow-2xl border-4 border-emerald-100 text-emerald-500 flex items-center justify-center">
              <MapIcon size={24} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all pointer-events-auto ${isOpen ? 'bg-slate-800 text-white' : 'bg-game-orange text-white'}`}
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </motion.button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <HashRouter>
        <div className="h-[100dvh] w-full bg-[#F0F9FF] overflow-hidden flex flex-col relative">
          <div className="flex-1 w-full max-w-[1440px] mx-auto relative bg-white overflow-hidden shadow-2xl">
             <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/map" element={<Map />} />
                  <Route path="/game/feed" element={<FeedTheDino />} />
                  <Route path="/game/jungle" element={<WordJungle />} />
                  <Route path="/game/volcano" element={<AlphaVolcano />} />
                  <Route path="/game/bubbles" element={<BubblePop />} />
                  <Route path="/game/eggs" element={<EggCounter />} />
                  <Route path="/game/desert" element={<ShapeDesert />} />
                  <Route path="/game/arctic" element={<ArcticOpposites />} />
                  <Route path="/game/ocean" element={<OceanVerbs />} />
                  <Route path="/game/space" element={<SpacePhonics />} />
                  <Route path="/game/farm" element={<FarmFeelings />} />
                  <Route path="/game/rainbow" element={<RainbowColors />} />
                  <Route path="/game/dressup" element={<DinoDressUp />} />
                  <Route path="/game/math" element={<MagicMath />} />
                  <Route path="/game/weather" element={<WeatherWatch />} />
                  <Route path="/game/bugs" element={<PrepositionBugs />} />
                  <Route path="/game/routine" element={<DailyRoutine />} />
                  <Route path="/game/plurals" element={<PluralFruits />} />
                  <Route path="/game/parlor" element={<PetParlor />} />
                  <Route path="/game/chef" element={<KitchenChef />} />
                  <Route path="/game/traffic" element={<TrafficHero />} />
                  <Route path="/game/size" element={<SizeExplorer />} />
                  <Route path="/game/finale" element={<DinoFinale />} />
                </Routes>
             </AnimatePresence>
             <Navigation />
          </div>
        </div>
      </HashRouter>
    </GameProvider>
  );
};

export default App;
