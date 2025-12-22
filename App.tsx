
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home as HomeIcon, Map as MapIcon, Trophy, RotateCw, Menu, X } from 'lucide-react';
import { GameProvider, useGame } from './GameContext.tsx';

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
  const { state } = useGame();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Hide nav icons in game to prevent distraction, but keep score
  const isGame = location.pathname.startsWith('/game/');

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-3">
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border-2 border-yellow-100 flex items-center gap-2 mb-1">
        <Trophy className="text-yellow-500" size={18} />
        <span className="font-black text-slate-700 text-sm">{state.score}</span>
      </div>

      <div className="relative">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              className="absolute top-16 right-0 flex flex-col gap-3"
            >
              <Link to="/" onClick={() => setIsOpen(false)} className="w-14 h-14 bg-white rounded-full shadow-xl border-2 border-sky-100 text-slate-500 flex items-center justify-center hover:bg-sky-50 transition-colors">
                <HomeIcon size={24} />
              </Link>
              <Link to="/map" onClick={() => setIsOpen(false)} className="w-14 h-14 bg-white rounded-full shadow-xl border-2 border-sky-100 text-slate-500 flex items-center justify-center hover:bg-sky-50 transition-colors">
                <MapIcon size={24} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all ${isOpen ? 'bg-slate-800 text-white' : 'bg-dino-green text-white'}`}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </motion.button>
      </div>
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        {/* All 22 Game Routes */}
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
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <HashRouter>
        <div className="h-[100dvh] w-full bg-[#F0F9FF] selection:bg-dino-green/30 overflow-hidden flex flex-col relative">
          <div className="flex-1 w-full max-w-[1440px] mx-auto relative bg-white overflow-hidden shadow-2xl">
             <AnimatedRoutes />
             <Navigation />
          </div>
        </div>
      </HashRouter>
    </GameProvider>
  );
};

export default App;
