
import React, { useState, useRef, useEffect } from 'react';
import { AppScreen, CardData, PlayerState, Rarity, ElementType } from '../types';
import { TopBar } from '../components/ui/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/ui/Button';
import { RARITY_STATS, RARITY_SELL_VALUES } from '../constants';
import { fetchAnimeWallpaper } from '../utils/animeImageApi';
import { generateProceduralSkills, generateCardProfiles, generateProceduralDescription } from '../services/geminiService';

interface DeckScreenProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  changeScreen: (screen: AppScreen) => void;
}

export const DeckScreen: React.FC<DeckScreenProps> = ({ playerState, setPlayerState, changeScreen }) => {
  const [filter, setFilter] = useState<Rarity | 'ALL'>('ALL');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [cardToSell, setCardToSell] = useState<CardData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgUrl, setBgUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCard) {
      const updatedCard = playerState.inventory.find(c => c.id === selectedCard.id);
      if (updatedCard && updatedCard.name !== selectedCard.name) {
        setSelectedCard(updatedCard);
      }
    }
  }, [playerState, selectedCard]);

  useEffect(() => {
    fetchAnimeWallpaper().then(url => {
      if (isMounted.current) setBgUrl(url);
    });
  }, []);

  const getImportRarity = (): Rarity => {
    const rand = Math.random();
    const importRates: [Rarity, number][] = [
      [Rarity.UR, 0.05],
      [Rarity.SSR, 0.15],
      [Rarity.SR, 0.30],
      [Rarity.R, 0.30],
      [Rarity.N, 0.20]
    ];
    
    let cumulative = 0;
    for (const [r, rate] of importRates) {
      cumulative += rate;
      if (rand <= cumulative) return r;
    }
    return Rarity.SR;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      
      const elements = Object.values(ElementType);
      const element = elements[Math.floor(Math.random() * elements.length)];
      
      const rolledRarity = getImportRarity();
      const stats = RARITY_STATS[rolledRarity];
      const variance = () => (0.9 + Math.random() * 0.2);

      // Instant fetch via background object pool
      const profiles = await generateCardProfiles(1, [element]);
      if (!isMounted.current) return;
      
      const profile = profiles[0];
      const fallbackName = `Imported ${file.name.split('.')[0].substring(0, 10)}`;

      const newCard: CardData = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: profile?.name || fallbackName,
        rarity: rolledRarity,
        element: element,
        imageUrl: result,
        hp: Math.floor(stats.hp * variance()),
        maxHp: Math.floor(stats.hp * variance()),
        attack: Math.floor(stats.atk * variance()),
        defense: Math.floor(stats.def * variance()),
        description: profile?.description || generateProceduralDescription(element, profile?.name || fallbackName),
        isCustom: true,
        skills: profile?.skills || generateProceduralSkills(element, profile?.name || fallbackName)
      };

      setPlayerState(prev => ({
        ...prev,
        inventory: [newCard, ...prev.inventory]
      }));

      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const executeSell = (card: CardData) => {
    const sellValue = RARITY_SELL_VALUES[card.rarity] || 10;
    
    setPlayerState(prev => ({
      ...prev,
      credits: prev.credits + sellValue,
      inventory: prev.inventory.filter(c => c.id !== card.id)
    }));
    
    setCardToSell(null);
    setSelectedCard(null);
  };

  const filteredInventory = playerState.inventory.filter(c => filter === 'ALL' || c.rarity === filter);

  const rarityValues = { [Rarity.UR]: 5, [Rarity.SSR]: 4, [Rarity.SR]: 3, [Rarity.R]: 2, [Rarity.N]: 1 };
  filteredInventory.sort((a, b) => {
    if (rarityValues[b.rarity] !== rarityValues[a.rarity]) {
      return rarityValues[b.rarity] - rarityValues[a.rarity];
    }
    return (b.id || '').localeCompare(a.id || '');
  });

  return (
    <div className="relative w-full h-full bg-slate-900 flex flex-col transform-gpu overflow-hidden">
      {bgUrl && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-20 mix-blend-overlay transition-all duration-1000 transform-gpu" 
          style={{ backgroundImage: `url(${bgUrl})` }}
        ></div>
      )}

      <TopBar playerState={playerState} onBack={() => changeScreen(AppScreen.HOME)} title="MY DECK" />

      <div className="relative z-10 flex-1 flex flex-col pt-16 sm:pt-24 px-4 sm:px-8 pb-4 sm:pb-8 overflow-hidden transform-gpu will-change-transform">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-700 shadow-2xl transform-gpu gap-3 sm:gap-0">
          <div className="flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto justify-center">
            {['ALL', Rarity.UR, Rarity.SSR, Rarity.SR, Rarity.R, Rarity.N].map(r => (
              <button 
                key={r}
                onClick={() => setFilter(r as any)}
                className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-black text-xs sm:text-sm transition-all transform-gpu hover:scale-105 ${filter === r ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/gif" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button variant="gold" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="text-xs sm:text-sm px-2 sm:px-4">
               {isImporting ? 'ANALYZING...' : 'IMPORT GIF / IMG'}
            </Button>
            <div className="text-gray-400 text-xs sm:text-sm bg-black/50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-white/10">
              Total: <span className="text-white font-bold">{playerState.inventory.length}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 pb-12 transform-gpu will-change-transform">
          {filteredInventory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-xl font-bold italic tracking-widest opacity-30">
              [ NO WARRIORS IN CRYOSLEEP ]
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6 transform-gpu">
              {filteredInventory.map(card => (
                <div key={card.id} className="animate-[scaleIn_0.3s_ease-out] transform-gpu">
                   <Card 
                    card={card} 
                    size="sm" 
                    onClick={() => setSelectedCard(card)} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 animate-[fadeIn_0.1s_ease-out] transform-gpu">
           <div className="relative bg-slate-900 border-2 border-slate-700 rounded-2xl sm:rounded-[2rem] w-full max-w-5xl flex flex-col md:flex-row h-[95vh] md:h-auto overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] transform-gpu">
             
             <div className="md:w-1/2 bg-black flex items-center justify-center p-4 sm:p-12 relative transform-gpu overflow-hidden shrink-0 h-1/3 md:h-auto">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] animate-pulse"></div>
               <Card card={selectedCard} size="md" className="sm:w-64 sm:h-96 z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]" is3D={true} />
             </div>

             <div className="md:w-1/2 p-4 sm:p-10 flex flex-col overflow-y-auto transform-gpu will-change-transform bg-slate-900 flex-1">
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="absolute top-2 right-2 sm:top-6 sm:right-6 bg-slate-800 hover:bg-red-600 text-white w-8 h-8 sm:w-12 sm:h-12 rounded-full font-bold flex items-center justify-center transition-all z-20 shadow-2xl border border-white/10"
                >
                  ✕
                </button>

                <div className="flex flex-wrap items-center justify-between mb-4 gap-2 pr-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-full font-black text-[10px] sm:text-xs tracking-tighter ${selectedCard.rarity === Rarity.UR ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-white'}`}>
                      {selectedCard.rarity}
                    </span>
                    <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full font-black text-[10px] sm:text-xs uppercase">
                      {selectedCard.element}
                    </span>
                  </div>
                  
                  <button onClick={() => setCardToSell(selectedCard)} className="text-red-500 hover:text-red-400 font-black text-[10px] sm:text-xs uppercase tracking-widest border border-red-500/30 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full hover:bg-red-500/10 transition-colors">
                    Dismantle: {RARITY_SELL_VALUES[selectedCard.rarity]} C
                  </button>
                </div>

                <h2 className={`text-2xl sm:text-5xl font-black mb-4 sm:mb-6 uppercase tracking-tighter ${selectedCard.rarity === Rarity.UR ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-red-400' : 'text-white'}`}>
                  <input
                    type="text"
                    value={selectedCard.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setPlayerState(prev => ({
                        ...prev,
                        inventory: prev.inventory.map(c => c.id === selectedCard.id ? { ...c, name: newName } : c)
                      }));
                      setSelectedCard(prev => prev ? { ...prev, name: newName } : null);
                    }}
                    className="bg-transparent border-b-2 border-blue-500/50 w-full focus:outline-none focus:border-blue-400"
                  />
                </h2>

                <div className="bg-black/50 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 mb-4 sm:mb-8 text-gray-300 italic text-sm sm:text-lg leading-relaxed shadow-inner">
                  "{selectedCard.description}"
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-6 sm:mb-10">
                  <div className="bg-slate-800 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 text-center shadow-lg">
                    <div className="text-gray-500 text-[8px] sm:text-[10px] uppercase font-black tracking-widest mb-1">Vitality</div>
                    <div className="text-green-400 font-black text-lg sm:text-2xl">{selectedCard.hp}</div>
                  </div>
                  <div className="bg-slate-800 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 text-center shadow-lg">
                    <div className="text-gray-500 text-[8px] sm:text-[10px] uppercase font-black tracking-widest mb-1">Power</div>
                    <div className="text-orange-400 font-black text-lg sm:text-2xl">{selectedCard.attack}</div>
                  </div>
                  <div className="bg-slate-800 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 text-center shadow-lg">
                    <div className="text-gray-500 text-[8px] sm:text-[10px] uppercase font-black tracking-widest mb-1">Shielding</div>
                    <div className="text-blue-400 font-black text-lg sm:text-2xl">{selectedCard.defense}</div>
                  </div>
                </div>

                <h3 className="text-lg sm:text-2xl font-black text-white mb-4 sm:mb-6 uppercase tracking-tighter border-b border-gray-800 pb-2">Unlocked Skills</h3>
                <div className="space-y-2 sm:space-y-4 pb-8">
                  {(selectedCard.skills || generateProceduralSkills(selectedCard.element, selectedCard.name)).map(skill => (
                    <div key={skill.type} className="group bg-slate-800/50 p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-default">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-lg text-white group-hover:text-blue-400 transition-colors">{skill.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-black/50 px-3 py-1 rounded-full">{skill.type}</span>
                      </div>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{skill.description}</p>
                    </div>
                  ))}
                </div>
             </div>
           </div>
        </div>
      )}

      {cardToSell && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.1s_ease-out] transform-gpu">
          <div className="bg-slate-900 border-2 border-red-500/50 rounded-[2rem] p-10 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] transform-gpu text-center">
            <div className="text-5xl mb-6">⚠️</div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-widest">DISMANTLE?</h3>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              You are about to recycle <span className="text-white font-bold">{cardToSell.name}</span> for scrap parts. This action is <span className="text-red-500 font-bold">PERMANENT</span>.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="danger" className="w-full" onClick={() => executeSell(cardToSell)}>CONFIRM RECYCLE</Button>
              <Button variant="secondary" className="w-full" onClick={() => setCardToSell(null)}>ABORT</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
