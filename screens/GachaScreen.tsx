import React, { useState, useEffect } from 'react';
import { AppScreen, BannerData, CardData, PlayerState, Rarity, ElementType } from '../types';
import { TopBar } from '../components/ui/TopBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/Card';
import { GACHA_COST_SINGLE, GACHA_COST_TEN, RARITY_RATES, RARITY_STATS, PITY_THRESHOLD, FALLBACK_IMAGES } from '../constants';
import { fetchDailyBanner, generateCardProfiles, generateProceduralSkills, generateProceduralName, generateProceduralDescription } from '../services/geminiService';
import { getRandomAnimeImage, fetchAnimeWallpaper } from '../utils/animeImageApi';

interface GachaScreenProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  changeScreen: (screen: AppScreen) => void;
}

export const GachaScreen: React.FC<GachaScreenProps> = ({ playerState, setPlayerState, changeScreen }) => {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [pullResults, setPullResults] = useState<CardData[] | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [bgUrl, setBgUrl] = useState('');

  useEffect(() => {
    fetchAnimeWallpaper().then(setBgUrl);

    const initBanner = () => {
      const today = new Date().toISOString().split('T')[0];
      const storedBanner = localStorage.getItem('dailyBanner');
      
      if (storedBanner) {
        try {
          const parsed = JSON.parse(storedBanner);
          // Safely check if the stored banner is valid
          if (parsed && parsed.date === today && Array.isArray(parsed.featuredCards) && parsed.featuredCards.length > 0) {
            setBanner(parsed);
            return;
          }
        } catch (e) {
          console.error("Stored banner parse error");
        }
      }

      // Optimistic Instant Load with High Quality Anime Fallbacks
      const fallbackName1 = generateProceduralName();
      const fallbackName2 = generateProceduralName();
      const fallback: BannerData = {
        date: today,
        featuredCards: [
          { name: fallbackName1, rarity: Rarity.UR, element: ElementType.FIRE, description: generateProceduralDescription(ElementType.FIRE, fallbackName1), hp: 15000, maxHp: 15000, attack: 950, defense: 450, imageUrl: FALLBACK_IMAGES[0], skills: generateProceduralSkills(ElementType.FIRE, fallbackName1) },
          { name: fallbackName2, rarity: Rarity.SSR, element: ElementType.WATER, description: generateProceduralDescription(ElementType.WATER, fallbackName2), hp: 6000, maxHp: 6000, attack: 400, defense: 200, imageUrl: FALLBACK_IMAGES[1], skills: generateProceduralSkills(ElementType.WATER, fallbackName2) }
        ]
      };
      setBanner(fallback);

      // Immediately spin up a background thread to fetch real anime images for the fallback characters
      getRandomAnimeImage(fallbackName1).then(img1 => {
        getRandomAnimeImage(fallbackName2).then(img2 => {
           setBanner(prev => {
              if (!prev || !prev.featuredCards || !prev.featuredCards[0] || prev.featuredCards[0].name !== fallbackName1) return prev;
              return {
                 ...prev,
                 featuredCards: [
                    { ...prev.featuredCards[0], imageUrl: img1 },
                    { ...prev.featuredCards[1], imageUrl: img2 }
                 ]
              };
           });
        });
      });

      // Async fetch full generative AI banner without blocking UI
      fetchDailyBanner().then(newBanner => {
         if (newBanner && newBanner.featuredCards && newBanner.featuredCards.length > 0) {
            setBanner(newBanner);
            localStorage.setItem('dailyBanner', JSON.stringify(newBanner));
         }
      });
    };

    initBanner();
  }, []);

  const determineCardStats = (forceSRorHigher = false, forceUR = false): Partial<CardData> => {
    let rollRarity = Rarity.N;
    
    if (forceUR) {
      rollRarity = Rarity.UR;
    } else {
      const rand = Math.random();
      let cumulative = 0;
      
      const rates = forceSRorHigher 
        ? { [Rarity.UR]: 0.05, [Rarity.SSR]: 0.25, [Rarity.SR]: 0.70, [Rarity.R]: 0, [Rarity.N]: 0 } 
        : RARITY_RATES;

      for (const [r, rate] of Object.entries(rates)) {
        cumulative += rate;
        if (rand <= cumulative) {
          rollRarity = r as Rarity;
          break;
        }
      }
    }

    if (banner && banner.featuredCards && Array.isArray(banner.featuredCards)) {
      const featured = banner.featuredCards.find(c => c.rarity === rollRarity);
      if (featured) {
         if (Math.random() > 0.5) {
            return {
              ...featured,
              id: `card_${Date.now()}_${Math.random().toString(36).substring(7)}`
            };
         }
      }
    }

    const elements = Object.values(ElementType);
    const element = elements[Math.floor(Math.random() * elements.length)];
    const stats = RARITY_STATS[rollRarity];
    const variance = () => (0.9 + Math.random() * 0.2);
    
    return {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      rarity: rollRarity,
      element,
      hp: Math.floor(stats.hp * variance()),
      maxHp: Math.floor(stats.hp * variance()),
      attack: Math.floor(stats.atk * variance()),
      defense: Math.floor(stats.def * variance()),
    };
  };

  const handlePull = async (times: number) => {
    const cost = times === 1 ? GACHA_COST_SINGLE : GACHA_COST_TEN;
    if (playerState.credits < cost) {
      alert("Not enough credits!");
      return;
    }

    setIsRolling(true);
    setPullResults(null);

    try {
      let currentPity = playerState.pityCount;
      const baseCards: Partial<CardData>[] = [];
      const elementsToGenerate: ElementType[] = [];

      for (let i = 0; i < times; i++) {
        currentPity++;
        let forceUR = false;
        let forceSR = false;

        if (currentPity >= PITY_THRESHOLD) {
          forceUR = true;
          currentPity = 0;
        } else if (times === 10 && i === 9) {
          forceSR = true;
        }

        const card = determineCardStats(forceSR, forceUR);
        if (card.rarity === Rarity.UR) {
           currentPity = 0;
        }
        baseCards.push(card);
        
        if (!card.name && card.element) {
          elementsToGenerate.push(card.element);
        }
      }

      // Almost instant due to background object pool cache
      const uniqueProfiles = await generateCardProfiles(elementsToGenerate.length, elementsToGenerate);
      let profileIdx = 0;

      const newCards: CardData[] = await Promise.all(
        baseCards.map(async (c) => {
          if (c.name) {
             return c as CardData;
          }
          
          const profile = uniqueProfiles[profileIdx++];
          const finalName = profile?.name || generateProceduralName();
          const finalDescription = profile?.description || generateProceduralDescription(c.element as ElementType, finalName);
          const finalSkills = profile?.skills || generateProceduralSkills(c.element as ElementType, finalName);
          const imageUrl = await getRandomAnimeImage(finalName + c.id);
          
          return { 
            ...c, 
            name: finalName, 
            description: finalDescription, 
            skills: finalSkills, 
            imageUrl 
          } as CardData;
        })
      );

      setPlayerState(prev => ({
        ...prev,
        credits: prev.credits - cost,
        pityCount: currentPity,
        inventory: [...newCards, ...prev.inventory]
      }));

      setPullResults(newCards);
    } catch (err) {
      console.error("Gacha pull encountered an error:", err);
      alert("There was a connection glitch summoning from the void. Please try again.");
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col transform-gpu">
      <TopBar playerState={playerState} onBack={() => changeScreen(AppScreen.HOME)} title="SUMMON" />

      <div 
        className="absolute inset-0 z-0 bg-cover opacity-20 bg-center animate-pulse-fast mix-blend-screen transition-all duration-1000 transform-gpu"
        style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }}
      ></div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-start sm:justify-center pt-20 sm:pt-24 pb-8 px-4 w-full max-w-7xl mx-auto transform-gpu will-change-transform overflow-y-auto">
        
        {!pullResults ? (
          <>
            {banner && banner.featuredCards && banner.featuredCards.length > 0 && (
              <div className="w-full flex flex-col items-center mb-8 sm:mb-12">
                <div className="bg-gradient-to-r from-transparent via-red-900/50 to-transparent w-full py-2 sm:py-4 text-center mb-4 sm:mb-8 border-y border-red-500/30 transform-gpu">
                   <h2 className="text-xl sm:text-3xl font-black text-yellow-400 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
                     LIMITED TIME: DESTINY AWAKENS
                   </h2>
                   <p className="text-red-200 text-xs sm:text-sm mt-1">Refreshes every 24 hours. AI Generated.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6 sm:gap-12 items-center justify-center transform-gpu">
                  {banner.featuredCards.map((card, idx) => (
                    <div key={idx} className="flex flex-col items-center group transform-gpu">
                      <div className="mb-2 sm:mb-4 text-center">
                        <span className={`text-sm sm:text-lg font-bold px-2 sm:px-3 py-1 rounded bg-black/60 border transform-gpu ${card.rarity === Rarity.UR ? 'text-red-400 border-red-500' : 'text-yellow-400 border-yellow-500'}`}>
                          RATE UP {card.rarity}
                        </span>
                      </div>
                      <Card card={{...card, id: 'display'}} size="lg" is3D={true} className="w-48 h-72 sm:w-64 sm:h-96" />
                      <div className="max-w-[12rem] sm:max-w-xs text-center mt-2 sm:mt-4 bg-black/60 p-2 sm:p-3 rounded text-xs sm:text-sm text-gray-300 backdrop-blur-sm border border-white/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity transform-gpu">
                         "{card.description}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-4 sm:gap-6 mt-auto transform-gpu pb-4">
               <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                 <Button 
                    variant="secondary" 
                    size="lg" 
                    onClick={() => handlePull(1)}
                    disabled={isRolling}
                    className="w-48 flex flex-col items-center gap-1 transform-gpu"
                  >
                   <span>1x PULL</span>
                   <span className="text-sm font-normal text-yellow-400">100 Credits</span>
                 </Button>
                 
                 <Button 
                    variant="gold" 
                    size="lg" 
                    onClick={() => handlePull(10)}
                    disabled={isRolling}
                    className="w-48 flex flex-col items-center gap-1 relative overflow-visible transform-gpu"
                  >
                   <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-black px-2 py-1 rounded transform rotate-12 shadow-lg z-20 border border-white">
                     GUARANTEED SR!
                   </div>
                   <span>10x PULL</span>
                   <span className="text-sm font-normal text-yellow-100">1000 Credits</span>
                 </Button>
               </div>
               
               <div className="bg-black/50 px-4 sm:px-6 py-2 rounded-full border border-white/10 transform-gpu text-sm sm:text-base">
                 <span className="text-gray-400">Pity Counter: </span>
                 <span className="text-white font-bold">{playerState.pityCount} / {PITY_THRESHOLD}</span>
                 <span className="text-[10px] sm:text-xs text-gray-500 ml-1 sm:ml-2 block sm:inline text-center">(UR Guaranteed at {PITY_THRESHOLD})</span>
               </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-start sm:justify-center pt-4 sm:pt-0 animate-fadeIn transform-gpu overflow-y-auto">
            <h2 className="text-2xl sm:text-4xl font-black mb-6 sm:mb-12 text-white tracking-widest drop-shadow-lg transform-gpu">SUMMON RESULTS</h2>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-5xl transform-gpu pb-20">
              {pullResults.map((card, idx) => (
                <div key={card.id} className="animate-shake transform-gpu" style={{ animationDelay: `${idx * 0.1}s`, animationIterationCount: 1 }}>
                  <Card card={card} size="sm" className="sm:w-48 sm:h-72 transform scale-0 animate-[scaleIn_0.2s_forwards] transform-gpu" />
                </div>
              ))}
            </div>
            <Button className="fixed bottom-4 sm:static sm:mt-12 transform-gpu z-50 w-[90%] sm:w-auto" onClick={() => setPullResults(null)}>
              CONFIRM
            </Button>
            <style>{`
              @keyframes scaleIn {
                to { transform: scale(1); }
              }
              .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {isRolling && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn transform-gpu">
             <div className="flex flex-col items-center transform-gpu">
               <div className="text-6xl animate-spin-slow mb-4">✨</div>
               <div className="text-xl font-bold tracking-widest uppercase animate-pulse">Summoning from the void...</div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};