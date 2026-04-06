import React from 'react';
import { PlayerState } from '../../types';

interface TopBarProps {
  playerState: PlayerState;
  onBack?: () => void;
  title: string;
}

export const TopBar: React.FC<TopBarProps> = ({ playerState, onBack, title }) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full p-1.5 sm:p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-50">
      <div className="flex items-center gap-1.5 sm:gap-4">
        {onBack && (
          <button 
            onClick={onBack}
            className="text-white hover:text-gray-300 bg-white/10 p-1 sm:p-2 rounded-full backdrop-blur-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <h1 className="text-sm sm:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase truncate max-w-[80px] sm:max-w-none">
          {title}
        </h1>
        <button 
          onClick={toggleFullscreen}
          className="text-white hover:text-gray-300 bg-white/10 p-1 sm:p-2 rounded-full backdrop-blur-sm transition ml-1 sm:ml-2"
          title="Toggle Fullscreen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-6 bg-black/50 px-2 sm:px-6 py-1 sm:py-2 rounded-full border border-white/10 backdrop-blur-md">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Level {playerState.level}</span>
          <div className="w-24 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${(playerState.exp % 1000) / 10}%` }}
            ></div>
          </div>
        </div>
        
        <div className="w-px h-6 sm:h-8 bg-white/20 hidden sm:block"></div>

        <div className="flex items-center gap-1 sm:gap-2 text-yellow-400 font-bold text-xs sm:text-xl drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
          </svg>
          {playerState.credits.toLocaleString()}
        </div>
      </div>
    </div>
  );
};
