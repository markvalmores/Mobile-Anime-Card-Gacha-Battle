import React, { useEffect, useState } from 'react';
import { fetchAnimeWallpaper } from '../utils/animeImageApi';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const [mounted, setMounted] = useState(false);
  const [bgUrl, setBgUrl] = useState('');

  useEffect(() => {
    console.log("TitleScreen mounted");
    setMounted(true);
    fetchAnimeWallpaper().then(setBgUrl);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 transform scale-110 animate-[pulse-fast_10s_ease-in-out_infinite] transition-all duration-1000"
          style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900/80 to-transparent"></div>
        {/* Particle effect simulation via repeating linear gradients */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_1%)] bg-[length:24px_24px] animate-float"></div>
      </div>

      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-200 to-blue-600 drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] mb-2 text-center tracking-tighter uppercase leading-tight">
          ANIME CARD GACHA
          <br/>
          <span className="text-6xl md:text-8xl bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)]">BATTLE</span>
        </h1>
        
        <p className="text-yellow-300 text-xl md:text-2xl mb-12 tracking-widest font-bold drop-shadow-[0_2px_5px_rgba(0,0,0,1)] text-center uppercase">
          by Mark David Valmores
        </p>

        <button 
          onClick={onStart} 
          className="text-2xl px-12 py-4 mt-4 bg-yellow-600 hover:bg-yellow-500 text-yellow-50 font-bold rounded-lg border-2 border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.9)] transition-all duration-200 active:scale-95"
        >
          TAP TO START
        </button>

        <div className="absolute bottom-[-100px] text-gray-500 text-sm">
          v1.0.0 © 2025 AI Studio
        </div>
      </div>
    </div>
  );
};
