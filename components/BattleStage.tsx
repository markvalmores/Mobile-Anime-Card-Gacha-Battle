
import React, { useState, useEffect } from 'react';
import { fetchAnimeWallpaper } from '../utils/animeImageApi';

interface BattleStageProps {
  children: React.ReactNode;
  theme: 'forest' | 'volcano' | 'ice' | 'space';
}

export const BattleStage: React.FC<BattleStageProps> = ({ children, theme }) => {
  const [bgUrl, setBgUrl] = useState('');

  useEffect(() => {
    fetchAnimeWallpaper().then(setBgUrl);
  }, [theme]);

  const themeColors = {
    forest: 'from-green-900/60 to-emerald-900/90',
    volcano: 'from-red-900/60 to-orange-900/90',
    ice: 'from-blue-900/60 to-cyan-900/90',
    space: 'from-purple-900/60 to-black/95'
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden bg-cover bg-center transition-all duration-1000 bg-slate-900"
      style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }}
    >
      {/* Dynamic Parallax Background Layers */}
      <div className={`absolute inset-0 bg-gradient-to-t ${themeColors[theme]} mix-blend-multiply opacity-80`}></div>
      
      {/* Atmospheric Particles */}
      <div className="particles"></div>

      {/* Enhanced 3D World Perspective */}
      <div className="absolute inset-0 flex items-center justify-center perspective-stage pointer-events-none">
        
        {/* Glowing 3D Floor with Depth */}
        <div className="w-[200%] h-[200%] absolute top-1/2 left-[-50%] stage-floor bg-[linear-gradient(rgba(255,255,255,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.05)_2px,transparent_2px)] bg-[length:80px_80px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)_inset]">
           {/* Center Focal Glow */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)]"></div>
           
           {/* Fade to Void */}
           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black"></div>
        </div>

        {/* Floating Arena Ring simulation */}
        <div className="absolute bottom-[20%] w-full h-1 bg-white/20 blur-sm animate-pulse"></div>

        {/* Actors layer (Cards) - Re-enable pointer events for UI interaction */}
        <div className="relative z-10 w-full max-w-5xl flex flex-col-reverse sm:flex-row justify-between items-center px-4 sm:px-12 pb-20 sm:pb-40 pointer-events-auto gap-8 sm:gap-0">
          {children}
        </div>
      </div>
      
      <style>{`
        @keyframes slide {
          0% { background-position: 0 0; }
          100% { background-position: 100px 100px; }
        }
      `}</style>
    </div>
  );
};
