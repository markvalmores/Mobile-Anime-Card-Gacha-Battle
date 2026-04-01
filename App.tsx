import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AppScreen, PlayerState } from './types';
import { TitleScreen } from './screens/TitleScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GachaScreen } from './screens/GachaScreen';
import { DeckScreen } from './screens/DeckScreen';
import { BattleScreen } from './screens/BattleScreen';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-4xl font-black text-red-500 mb-4">SYSTEM CRASH!</h1>
          <p className="text-gray-300 mb-8 max-w-md">
            The anime multiverse encountered a critical anomaly. This usually happens when the browser runs out of memory or an AI service fails.
          </p>
          <div className="bg-black/50 p-4 rounded border border-red-500/30 mb-8 w-full max-w-lg overflow-auto max-h-40 text-left font-mono text-xs text-red-400">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <div className="w-full h-full font-sans antialiased text-white overflow-hidden bg-black selection:bg-blue-500/30">
        
        {currentScreen === AppScreen.TITLE && (
          <TitleScreen onStart={() => changeScreen(AppScreen.HOME)} />
        )}
        
        {currentScreen === AppScreen.HOME && (
          <HomeScreen playerState={playerState} changeScreen={changeScreen} resetToTitle={resetToTitle} />
        )}

        {currentScreen === AppScreen.GACHA && (
          <GachaScreen 
            playerState={playerState} 
            setPlayerState={setPlayerState} 
            changeScreen={changeScreen} 
          />
        )}

        {currentScreen === AppScreen.DECK && (
          <DeckScreen 
            playerState={playerState} 
            setPlayerState={setPlayerState} 
            changeScreen={changeScreen} 
          />
        )}

        {currentScreen === AppScreen.BATTLE && (
          <BattleScreen 
            playerState={playerState} 
            setPlayerState={setPlayerState} 
            changeScreen={changeScreen} 
          />
        )}

      </div>
    </ErrorBoundary>
  );
};

export default App;