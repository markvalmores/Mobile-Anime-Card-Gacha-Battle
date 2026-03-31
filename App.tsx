import React, { useState, useEffect } from 'react';
import { AppScreen, PlayerState } from './types';
import { TitleScreen } from './screens/TitleScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GachaScreen } from './screens/GachaScreen';
import { DeckScreen } from './screens/DeckScreen';
import { BattleScreen } from './screens/BattleScreen';

const defaultPlayerState: PlayerState = {
  credits: 1000,
  pityCount: 0,
  inventory: [],
  level: 1,
  exp: 0
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.TITLE);
  const [playerState, setPlayerState] = useState<PlayerState>(defaultPlayerState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('playerState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlayerState(prev => ({
          credits: typeof parsed.credits === 'number' ? parsed.credits : prev.credits,
          pityCount: typeof parsed.pityCount === 'number' ? parsed.pityCount : prev.pityCount,
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : prev.inventory,
          level: typeof parsed.level === 'number' ? parsed.level : prev.level,
          exp: typeof parsed.exp === 'number' ? parsed.exp : prev.exp
        }));
      } catch (e) {
        console.error("Failed to parse saved state");
      }
    }
    setIsLoaded(true);
    setCurrentScreen(AppScreen.TITLE);
    localStorage.removeItem('currentScreen');
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('playerState', JSON.stringify(playerState));
    }
  }, [playerState, isLoaded]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const changeScreen = (screen: AppScreen) => {
    setCurrentScreen(screen);
    localStorage.setItem('currentScreen', screen);
  };

  const resetToTitle = () => {
    setCurrentScreen(AppScreen.TITLE);
    localStorage.removeItem('currentScreen');
  };

  useEffect(() => {
    console.log("Current screen changed to:", currentScreen);
  }, [currentScreen]);

  console.log("Rendering App with currentScreen:", currentScreen);

  if (!isLoaded) return <div className="bg-black w-screen h-screen"></div>;

  return (
    <div className="w-full h-full font-sans antialiased text-white overflow-hidden bg-black selection:bg-blue-500/30">
      
      <div className={currentScreen === AppScreen.TITLE ? 'w-full h-full' : 'hidden'}>
        <TitleScreen onStart={() => changeScreen(AppScreen.HOME)} />
      </div>
      
      <div className={currentScreen === AppScreen.HOME ? 'w-full h-full home-screen-container' : 'hidden'}>
        <HomeScreen playerState={playerState} changeScreen={changeScreen} resetToTitle={resetToTitle} />
      </div>

      <div className={currentScreen === AppScreen.GACHA ? 'w-full h-full' : 'hidden'}>
        <GachaScreen 
          playerState={playerState} 
          setPlayerState={setPlayerState} 
          changeScreen={changeScreen} 
        />
      </div>

      <div className={currentScreen === AppScreen.DECK ? 'w-full h-full' : 'hidden'}>
        <DeckScreen 
          playerState={playerState} 
          setPlayerState={setPlayerState} 
          changeScreen={changeScreen} 
        />
      </div>

      <div className={currentScreen === AppScreen.BATTLE ? 'w-full h-full' : 'hidden'}>
        <BattleScreen 
          playerState={playerState} 
          setPlayerState={setPlayerState} 
          changeScreen={changeScreen} 
        />
      </div>

    </div>
  );
};

export default App;