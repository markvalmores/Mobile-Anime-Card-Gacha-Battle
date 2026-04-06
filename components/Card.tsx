import React from 'react';
import { CardData, Rarity } from '../types';
import { FALLBACK_IMAGES } from '../constants';

interface CardProps {
  card: CardData;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  is3D?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, size = 'md', onClick, className = '', is3D = false }) => {
  
  const rarityColors = {
    [Rarity.N]: 'from-gray-500 to-gray-700 border-gray-400',
    [Rarity.R]: 'from-blue-500 to-blue-800 border-blue-400',
    [Rarity.SR]: 'from-purple-500 to-purple-800 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    [Rarity.SSR]: 'from-yellow-400 to-orange-600 border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.7)]',
    [Rarity.UR]: 'from-red-500 via-pink-500 to-purple-600 border-red-300 shadow-[0_0_35px_rgba(239,68,68,0.9)] animate-pulse-fast'
  };

  const sizes = {
    sm: 'w-20 h-32 sm:w-24 sm:h-36 text-[10px] sm:text-xs',
    md: 'w-28 h-40 sm:w-48 sm:h-72 text-[10px] sm:text-sm',
    lg: 'w-32 h-48 sm:w-64 sm:h-96 text-xs sm:text-base'
  };

  const isUR = card.rarity === Rarity.UR;

  return (
    <div 
      onClick={onClick}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 ease-out
        bg-gradient-to-br ${rarityColors[card.rarity]} border-4 transform-gpu will-change-transform
        ${sizes[size]} ${className}
        ${is3D ? 'hover:translate-z-10 hover:-translate-y-4 hover:rotate-y-12' : 'hover:-translate-y-2'}
      `}
      style={is3D ? { transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' } : { backfaceVisibility: 'hidden' }}
    >
      {/* Background Image Container */}
      <div className="absolute inset-1 bg-black rounded-lg overflow-hidden">
        <img 
          src={card.imageUrl} 
          alt={card.name}
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
             // Instant fallback to generic anime if image fails to load
             (e.target as HTMLImageElement).src = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
          }}
        />
        {/* Inner gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
      </div>

      {/* Card Content */}
      <div className="absolute inset-0 p-2 flex flex-col justify-between z-10 pointer-events-none">
        
        {/* Header */}
        <div className="flex justify-between items-start drop-shadow-md">
          <div className="bg-black/60 px-2 py-1 rounded border border-white/20">
             <span className="font-bold text-white">{card.element}</span>
          </div>
          <div className={`font-black text-lg px-2 rounded-bl-lg bg-black/80 ${isUR ? 'text-red-400' : 'text-white'}`}>
            {card.rarity}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-auto drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          <h3 className={`font-black truncate ${size === 'sm' ? 'text-sm' : 'text-xl'} ${isUR ? 'text-yellow-300' : 'text-white'}`}>
            {card.name}
          </h3>
          {size !== 'sm' && (
            <div className="flex gap-2 mt-1 text-gray-200">
              <span className="bg-red-900/80 px-1 rounded">HP: {card.hp}</span>
              <span className="bg-orange-900/80 px-1 rounded">ATK: {card.attack}</span>
            </div>
          )}
        </div>
      </div>

      {/* UR specific glint effect overlay */}
      {isUR && <div className="absolute inset-0 ur-glint opacity-30 pointer-events-none z-20 mix-blend-overlay transform-gpu"></div>}
    </div>
  );
};
