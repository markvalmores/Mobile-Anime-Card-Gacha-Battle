import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppScreen, CardData, ElementType, PlayerState, Rarity, Skill, SkillType } from '../types';
import { TopBar } from '../components/ui/TopBar';
import { Card } from '../components/Card';
import { BattleStage } from '../components/BattleStage';
import { RARITY_STATS, BATTLE_REWARDS } from '../constants';
import { Button } from '../components/ui/Button';
import { getRandomAnimeImage } from '../utils/animeImageApi';
import { generateCardProfiles, generateProceduralSkills, generateVictoryImage } from '../services/geminiService';
import { fetchAttackEffect } from '../utils/effectApi';

interface BattleScreenProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  changeScreen: (screen: AppScreen) => void;
}

type BattlePhase = 'SELECT' | 'FIGHT' | 'RESULT';

interface Combatant extends CardData {
  currentHp: number;
  shield: number;
  isGuarding: boolean;
  cooldowns: Record<SkillType, number>;
}

interface FloatingText {
  id: number;
  text: string;
  target: 'PLAYER' | 'ENEMY';
  color: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const BattleScreen: React.FC<BattleScreenProps> = ({ playerState, setPlayerState, changeScreen }) => {
  const [phase, setPhase] = useState<BattlePhase>('SELECT');
  const [filter, setFilter] = useState<Rarity | 'ALL'>('ALL');
  const [playerCard, setPlayerCard] = useState<Combatant | null>(null);
  const [enemyCard, setEnemyCard] = useState<Combatant | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY'>('PLAYER');
  
  const playerCardRef = useRef<Combatant | null>(null);
  const enemyCardRef = useRef<Combatant | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [vsFlashing, setVsFlashing] = useState(false);
  const [activeEffect, setActiveEffect] = useState<{ target: 'PLAYER' | 'ENEMY', url: string } | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [earnedRewards, setEarnedRewards] = useState({ credits: 0, exp: 0 });
  
  const [victoryImageUrl, setVictoryImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const themes = ['forest', 'volcano', 'ice', 'space'] as const;
  const [stageTheme] = useState(themes[Math.floor(Math.random() * themes.length)]);

  useEffect(() => {
    playerCardRef.current = playerCard;
    enemyCardRef.current = enemyCard;
  }, [playerCard, enemyCard]);

  useEffect(() => {
    if (phase === 'SELECT') {
      setVictoryImageUrl(null);
      setShowShareModal(false);
    }
  }, [phase]);

  const ensureSkills = (card: CardData): CardData => {
    if (card.skills && card.skills.length === 4) return card;
    return { ...card, skills: generateProceduralSkills(card.element, card.name) };
  };

  const generateEnemyAsync = useCallback(async (playerChosenCard: CardData): Promise<Combatant> => {
    const level = playerState.level;
    const rand = Math.random();
    let rarity = Rarity.N;

    // Normal & Balanced Probability Curve based on player's level (not just copying the player's card)
    let chances = { N: 0.50, R: 0.30, SR: 0.15, SSR: 0.04, UR: 0.01 };
    if (level >= 15) {
       chances = { N: 0.05, R: 0.20, SR: 0.40, SSR: 0.25, UR: 0.10 };
    } else if (level >= 8) {
       chances = { N: 0.20, R: 0.35, SR: 0.30, SSR: 0.10, UR: 0.05 };
    } else if (level >= 3) {
       chances = { N: 0.35, R: 0.40, SR: 0.20, SSR: 0.04, UR: 0.01 };
    }

    let cumulative = 0;
    if (rand < (cumulative += chances.N)) rarity = Rarity.N;
    else if (rand < (cumulative += chances.R)) rarity = Rarity.R;
    else if (rand < (cumulative += chances.SR)) rarity = Rarity.SR;
    else if (rand < (cumulative += chances.SSR)) rarity = Rarity.SSR;
    else rarity = Rarity.UR;
    
    const elements = Object.values(ElementType);
    const element = elements[Math.floor(Math.random() * elements.length)];
    const stats = RARITY_STATS[rarity];
    
    // Instant generation utilizing background object pool
    const generatedProfiles = await generateCardProfiles(1, [element]);
    const profile = generatedProfiles[0];
    const name = profile?.name || `Rogue ${rarity} Entity`;
    const skills = profile?.skills || generateProceduralSkills(element, name);

    const imageUrl = await getRandomAnimeImage(name + Date.now());
    
    // Normal health bar scaling (1.2x instead of massively inflated, for fair pacing)
    const bossHp = Math.floor(stats.hp * 1.2);
    const bossAtk = Math.floor(stats.atk * 1.05);
    const bossDef = Math.floor(stats.def * 1.05);

    return {
      id: `enemy_${Date.now()}`,
      name,
      rarity,
      element,
      imageUrl,
      hp: bossHp,
      maxHp: bossHp,
      currentHp: bossHp,
      attack: bossAtk,
      defense: bossDef,
      shield: 0,
      isGuarding: false,
      skills,
      cooldowns: { [SkillType.BASIC]: 0, [SkillType.HEAVY]: 0, [SkillType.DEFEND]: 0, [SkillType.ULTIMATE]: 0 }
    };
  }, [playerState.level]);

  const startGame = async (selectedCard: CardData) => {
    const enemy = await generateEnemyAsync(selectedCard);
    const readyCard = ensureSkills(selectedCard);
    
    setPlayerCard({ 
      ...readyCard, 
      currentHp: readyCard.hp, 
      shield: 0,
      isGuarding: false,
      cooldowns: { [SkillType.BASIC]: 0, [SkillType.HEAVY]: 0, [SkillType.DEFEND]: 0, [SkillType.ULTIMATE]: 0 }
    });
    setEnemyCard(enemy);
    setCombatLog(["Battle Initiated! Elements dictate advantage."]);
    setPhase('FIGHT');
    setTurn('PLAYER');
    
    setVsFlashing(true);
    setTimeout(() => {
      setVsFlashing(false);
    }, 800);
  };

  const getElementalMultiplier = (atkEl: ElementType, defEl: ElementType) => {
    if (atkEl === ElementType.WATER && defEl === ElementType.FIRE) return 1.5;
    if (atkEl === ElementType.FIRE && defEl === ElementType.EARTH) return 1.5;
    if (atkEl === ElementType.EARTH && defEl === ElementType.WATER) return 1.5;
    if (atkEl === ElementType.LIGHT && defEl === ElementType.DARK) return 1.5;
    if (atkEl === ElementType.DARK && defEl === ElementType.LIGHT) return 1.5;

    if (atkEl === ElementType.FIRE && defEl === ElementType.WATER) return 0.75;
    if (atkEl === ElementType.EARTH && defEl === ElementType.FIRE) return 0.75;
    if (atkEl === ElementType.WATER && defEl === ElementType.EARTH) return 0.75;
    if (atkEl === defEl) return 0.9;
    return 1.0;
  };

  const calculateDamage = (atk: number, def: number, multiplier: number) => {
    // Smoother, highly balanced damage curve
    const effectiveAtk = atk * multiplier;
    const baseDamage = (effectiveAtk * 2.5 * effectiveAtk) / (effectiveAtk + def * 2.0 + 50);
    const variance = (Math.random() * 0.15) + 0.925; // 0.925x - 1.075x
    return Math.max(1, Math.floor(baseDamage * variance));
  };

  const addFloatingText = (text: string, target: 'PLAYER' | 'ENEMY', color: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, target, color }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 800);
  };

  const addLog = (msg: string) => {
    setCombatLog(prev => [msg, ...prev].slice(0, 5));
  };

  const handlePlayerSkill = (skill: Skill) => {
    if (!playerCard || !enemyCard || turn !== 'PLAYER' || isAnimating) return;
    if (playerCard.cooldowns[skill.type] > 0) return; 
    executeTurn(skill, 'PLAYER');
  };

  const executeTurn = async (skill: Skill, actor: 'PLAYER' | 'ENEMY') => {
    const isPlayer = actor === 'PLAYER';
    const attacker = isPlayer ? playerCardRef.current : enemyCardRef.current;
    const defender = isPlayer ? enemyCardRef.current : playerCardRef.current;
    
    if (!attacker || !defender) return;

    setIsAnimating(true);
    const targetSide = isPlayer ? 'ENEMY' : 'PLAYER';

    let dmgMultiplier = 1.0;
    let shieldMultiplier = 0;
    let newCooldown = 0;
    let isGuardingAction = false;

    // Refined Multipliers (No massive 2.5x spikes, pacing is better)
    switch (skill.type) {
      case SkillType.BASIC: dmgMultiplier = 1.0; break;
      case SkillType.HEAVY: dmgMultiplier = 1.5; newCooldown = 2; break;
      case SkillType.DEFEND: dmgMultiplier = 0; shieldMultiplier = 1.5; newCooldown = 2; isGuardingAction = true; break;
      case SkillType.ULTIMATE: dmgMultiplier = 2.0; shieldMultiplier = 0.5; newCooldown = 4; break;
    }

    await sleep(50); // Dash

    const effectBaseUrl = await fetchAttackEffect(skill.type);
    setActiveEffect({ target: targetSide, url: `${effectBaseUrl}?t=${Date.now()}` });

    const elementMult = getElementalMultiplier(attacker.element, defender.element);
    const isTargetGuarding = defender.isGuarding;
    const finalDmgMultiplier = dmgMultiplier * elementMult * (isTargetGuarding ? 0.5 : 1);

    let dmg = 0;
    if (dmgMultiplier > 0) {
      dmg = calculateDamage(attacker.attack, defender.defense, finalDmgMultiplier);
      
      // STRICT, BALANCED ANTI-INSTANT-DEATH SYSTEM
      // Forces matches to take multiple turns, avoiding rocket-tag balancing.
      let maxDamageCap = defender.maxHp * 0.20; // Basic hits can never exceed 20%
      if (skill.type === SkillType.HEAVY) maxDamageCap = defender.maxHp * 0.35; // Heavy max 35%
      if (skill.type === SkillType.ULTIMATE) maxDamageCap = defender.maxHp * 0.50; // Ultimate max 50%
      
      dmg = Math.min(dmg, Math.floor(maxDamageCap));
      dmg = Math.max(1, dmg); // Always at least 1 damage
      
      let textParams = { text: dmg.toString(), color: 'text-red-500' };
      if (isTargetGuarding) textParams = { text: `${dmg} (GUARDED)`, color: 'text-blue-300' };
      else if (elementMult > 1) textParams = { text: `${dmg} (WEAK!)`, color: 'text-yellow-400' };
      else if (elementMult < 1) textParams = { text: `${dmg} (RESIST)`, color: 'text-gray-400' };

      addFloatingText(textParams.text, targetSide, textParams.color);
      addLog(`${attacker.name} uses [${skill.name}] for ${dmg} damage!`);
    } else {
      addFloatingText('GUARD UP', actor, 'text-blue-400');
      addLog(`${attacker.name} enters a defensive stance!`);
    }

    const nextAttackerCooldowns = { ...attacker.cooldowns };
    (Object.keys(nextAttackerCooldowns) as SkillType[]).forEach(k => {
        if (nextAttackerCooldowns[k] > 0) nextAttackerCooldowns[k] -= 1;
    });
    nextAttackerCooldowns[skill.type] = newCooldown;

    let newAttackerShield = attacker.shield;
    if (shieldMultiplier > 0) {
        const shieldGain = Math.floor(attacker.maxHp * 0.15 + attacker.defense * shieldMultiplier);
        newAttackerShield += shieldGain;
        // Strict Hard Limit: Make absolutely sure the shield cannot surpass 1000
        newAttackerShield = Math.min(newAttackerShield, 1000);
    }

    const newAttacker = {
      ...attacker,
      cooldowns: nextAttackerCooldowns,
      shield: newAttackerShield,
      isGuarding: isGuardingAction
    };

    let newDefenderShield = defender.shield;
    let remainingDmg = dmg;
    
    if (newDefenderShield > 0 && remainingDmg > 0) {
      if (newDefenderShield >= remainingDmg) {
        newDefenderShield -= remainingDmg;
        remainingDmg = 0;
      } else {
        remainingDmg -= newDefenderShield;
        newDefenderShield = 0;
      }
    }
    
    const newDefenderHp = Math.max(0, defender.currentHp - remainingDmg);

    const newDefender = {
      ...defender,
      shield: newDefenderShield,
      currentHp: newDefenderHp
    };

    if (isPlayer) {
      setPlayerCard(newAttacker);
      setEnemyCard(newDefender);
    } else {
      setEnemyCard(newAttacker);
      setPlayerCard(newDefender);
    }

    await sleep(300); 
    setActiveEffect(null);
    await sleep(50); 
    setIsAnimating(false);

    if (newDefenderHp <= 0) {
       if (isPlayer) {
          handleWin(newDefender); 
       } else {
          handleLose();
       }
    } else {
       if (isPlayer) {
         setTurn('ENEMY');
         setTimeout(() => enemyAI(), 300);
       } else {
         setTurn('PLAYER');
       }
    }
  };

  const enemyAI = () => {
     const currentPlayer = playerCardRef.current;
     const currentEnemy = enemyCardRef.current;
     if (!currentPlayer || !currentEnemy) return;

     const hpPercent = currentEnemy.currentHp / currentEnemy.maxHp;
     const playerEffectiveHp = currentPlayer.currentHp + currentPlayer.shield;
     
     const availableSkills = currentEnemy.skills!.filter(s => currentEnemy.cooldowns[s.type] === 0);
     const getSkill = (t: SkillType) => availableSkills.find(s => s.type === t);

     let chosenSkill = getSkill(SkillType.BASIC)!;

     const elementMult = getElementalMultiplier(currentEnemy.element, currentPlayer.element);
     const guardMult = currentPlayer.isGuarding ? 0.5 : 1;
     // Adjust AI predictive check for lower multipliers
     const estimatedHeavyDmg = calculateDamage(currentEnemy.attack, currentPlayer.defense, 1.5 * elementMult * guardMult);
     
     // Balanced & Smart AI Behavior
     if (getSkill(SkillType.ULTIMATE) && Math.random() > 0.3) {
        chosenSkill = getSkill(SkillType.ULTIMATE)!; 
     } 
     else if (getSkill(SkillType.HEAVY) && (currentPlayer.isGuarding || currentPlayer.shield > 0 || estimatedHeavyDmg >= playerEffectiveHp)) {
        chosenSkill = getSkill(SkillType.HEAVY)!;
     } 
     else if (hpPercent < 0.5 && currentEnemy.shield === 0 && getSkill(SkillType.DEFEND)) {
        chosenSkill = getSkill(SkillType.DEFEND)!; 
     }
     else {
        chosenSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
     }

     executeTurn(chosenSkill, 'ENEMY');
  };

  const handleWin = (defeatedEnemy: Combatant) => {
    setPhase('RESULT');
    setIsAnimating(false);
    
    const baseRewards = BATTLE_REWARDS[defeatedEnemy.rarity];
    const variance = (Math.random() * 0.2) + 0.9; 
    const finalExp = Math.floor(baseRewards.exp * variance);
    const finalCredits = Math.floor(baseRewards.credits * variance);
    
    setEarnedRewards({ exp: finalExp, credits: finalCredits });

    setPlayerState(prev => {
      let newExp = prev.exp + finalExp;
      let newLevel = prev.level;
      if (newExp >= 1000) {
        newLevel += Math.floor(newExp / 1000);
        newExp = newExp % 1000;
      }
      return {
        ...prev,
        credits: prev.credits + finalCredits,
        exp: newExp,
        level: newLevel
      };
    });
  };

  const handleLose = () => {
    setPhase('RESULT');
    setIsAnimating(false);
  };

  const handleGenerateShareImage = async () => {
    if (victoryImageUrl) {
      setShowShareModal(true);
      return;
    }
    
    if (!playerCard) return;
    
    setIsGeneratingImage(true);
    const url = await generateVictoryImage(playerCard.name, playerCard.element, playerCard.currentHp);
    if (url) {
      setVictoryImageUrl(url);
      setShowShareModal(true);
    } else {
      alert("Failed to generate victory image from AI. Please try again.");
    }
    setIsGeneratingImage(false);
  };

  const handleShare = async () => {
    if (!victoryImageUrl || !playerCard) return;
    if (navigator.share) {
      try {
        const res = await fetch(victoryImageUrl);
        const blob = await res.blob();
        const file = new File([blob], 'victory.png', { type: 'image/png' });
        await navigator.share({
          title: 'Epic Anime Gacha Battle Victory',
          text: `I just won a battle using ${playerCard.name} with ${playerCard.currentHp} HP remaining!`,
          files: [file]
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
       const a = document.createElement('a');
       a.href = victoryImageUrl;
       a.download = `victory_${playerCard.name.replace(/\s+/g, '_')}.png`;
       a.click();
    }
  };

  const HealthBar = ({ current, max, shield, isGuarding, name, element }: { current: number, max: number, shield: number, isGuarding: boolean, name: string, element: ElementType }) => {
    const hpPercent = Math.max(0, (current / max) * 100);
    return (
      <div className="w-48 sm:w-64 bg-black/80 p-2 rounded border border-white/20 backdrop-blur-sm shadow-xl transform-gpu will-change-transform">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="truncate pr-2 flex items-center gap-1">
            <span className="bg-slate-700 px-1 rounded text-[10px] tracking-widest">{element}</span> {name}
          </span>
          <span className="shrink-0">{current} / {max}</span>
        </div>
        <div className="relative h-4 bg-gray-800 rounded overflow-hidden transform-gpu">
          <div className={`absolute top-0 left-0 h-full transition-all duration-300 transform-gpu ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${hpPercent}%` }}></div>
        </div>
        <div className="flex justify-between mt-1 h-4">
          {shield > 0 ? (
            <div className="text-xs text-blue-300 font-bold flex items-center gap-1">
              🛡️ {shield}
            </div>
          ) : <div></div>}
          {isGuarding && (
            <div className="text-xs text-purple-300 font-bold flex items-center gap-1 animate-pulse transform-gpu">
              ⚔️ GUARDING
            </div>
          )}
        </div>
      </div>
    );
  };

  if (phase === 'SELECT') {
    return (
      <div className="relative w-full h-full bg-slate-900 flex flex-col">
        <TopBar playerState={playerState} onBack={() => changeScreen(AppScreen.HOME)} title="SELECT FIGHTER" />
        <div className="flex-1 overflow-y-auto pt-24 px-8 pb-8 transform-gpu will-change-transform">
           <div className="flex justify-between items-center mb-6 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl transform-gpu">
             <div className="flex flex-wrap gap-2">
               {['ALL', Rarity.UR, Rarity.SSR, Rarity.SR, Rarity.R, Rarity.N].map(r => (
                 <button 
                   key={r}
                   onClick={() => setFilter(r as any)}
                   className={`px-4 py-2 rounded-lg font-black text-sm transition-all transform-gpu hover:scale-105 ${filter === r ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'}`}
                 >
                   {r}
                 </button>
               ))}
             </div>
           </div>
           {playerState.inventory.filter(c => filter === 'ALL' || c.rarity === filter).length === 0 ? (
             <div className="text-center mt-20">
               <h2 className="text-2xl mb-4">No cards found for this rarity!</h2>
               <Button onClick={() => changeScreen(AppScreen.GACHA)}>Go to Summon</Button>
             </div>
           ) : (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {playerState.inventory.filter(c => filter === 'ALL' || c.rarity === filter).map(card => (
                  <div key={card.id} onClick={() => startGame(card)} className="transform hover:scale-105 transition cursor-pointer transform-gpu">
                    <Card card={ensureSkills(card)} size="sm" />
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <BattleStage theme={stageTheme}>
        
        {/* Player Side */}
        <div className={`flex flex-col items-center gap-4 transition-transform duration-200 transform-gpu will-change-transform ${turn === 'PLAYER' && !isAnimating ? 'scale-110' : 'scale-100 opacity-80'}`}>
          <HealthBar 
            current={playerCard?.currentHp || 0} 
            max={playerCard?.maxHp || 1} 
            shield={playerCard?.shield || 0} 
            isGuarding={playerCard?.isGuarding || false}
            name={playerCard?.name || 'Player'} 
            element={playerCard?.element || ElementType.LIGHT}
          />
          
          <div className={`relative transform-gpu will-change-transform ${isAnimating && turn === 'PLAYER' ? 'animate-[attackMoveRight_0.2s_ease-in-out]' : ''}`}>
             {playerCard && <Card card={playerCard} size="lg" className="shadow-[20px_20px_30px_rgba(0,0,0,0.8)]" />}
             
             {activeEffect?.target === 'PLAYER' && (
                <img src={activeEffect.url} alt="Effect" className="absolute inset-0 w-[150%] h-[150%] top-[-25%] left-[-25%] object-contain z-40 pointer-events-none mix-blend-screen drop-shadow-2xl transform-gpu" />
             )}
             
             {floatingTexts.filter(t => t.target === 'PLAYER').map(t => (
               <div key={t.id} className={`absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-6xl font-black italic drop-shadow-[0_4px_10px_black] z-50 pointer-events-none animate-[floatUpFade_0.8s_ease-out_forwards] transform-gpu will-change-transform ${t.color}`}>
                 {t.text}
               </div>
             ))}
          </div>
        </div>

        <div className={`text-4xl sm:text-6xl font-black italic mix-blend-overlay pointer-events-none transition-all transform-gpu will-change-transform ${vsFlashing ? 'animate-[flashVS_0.8s_ease-out_forwards] z-50' : 'text-white/50 animate-pulse'}`}>
          VS
        </div>

        {/* Enemy Side */}
        <div className={`flex flex-col items-center gap-4 transition-transform duration-200 transform-gpu will-change-transform ${turn === 'ENEMY' && !isAnimating ? 'scale-110' : 'scale-100 opacity-80'}`}>
          <HealthBar 
            current={enemyCard?.currentHp || 0} 
            max={enemyCard?.maxHp || 1} 
            shield={enemyCard?.shield || 0} 
            isGuarding={enemyCard?.isGuarding || false}
            name={enemyCard?.name || 'Enemy'} 
            element={enemyCard?.element || ElementType.DARK}
          />
          
          <div className={`relative transform-gpu will-change-transform ${isAnimating && turn === 'ENEMY' ? 'animate-[attackMoveLeft_0.2s_ease-in-out]' : ''}`}>
             {enemyCard && <Card card={enemyCard} size="lg" className="shadow-[-20px_20px_30px_rgba(0,0,0,0.8)] border-red-500" />}
             
             {activeEffect?.target === 'ENEMY' && (
                <img src={activeEffect.url} alt="Effect" className="absolute inset-0 w-[150%] h-[150%] top-[-25%] left-[-25%] object-contain z-40 pointer-events-none mix-blend-screen drop-shadow-2xl transform-gpu" />
             )}

             {floatingTexts.filter(t => t.target === 'ENEMY').map(t => (
               <div key={t.id} className={`absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-6xl font-black italic drop-shadow-[0_4px_10px_black] z-50 pointer-events-none animate-[floatUpFade_0.8s_ease-out_forwards] transform-gpu will-change-transform ${t.color}`}>
                 {t.text}
               </div>
             ))}
          </div>
        </div>

      </BattleStage>

      <div className="absolute inset-0 z-[60] pointer-events-none flex flex-col justify-between transform-gpu">
        
        <div className="p-4 flex justify-between">
           <button onClick={() => changeScreen(AppScreen.HOME)} className="pointer-events-auto bg-black/50 text-white px-4 py-2 rounded font-bold hover:bg-black/80 border border-white/20 backdrop-blur-md transform-gpu">FLEE</button>
        </div>

        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-[90%] sm:w-[500px] bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-3 max-h-40 overflow-hidden pointer-events-auto transform-gpu">
          {combatLog.map((log, i) => (
            <div key={i} className={`text-xs sm:text-sm ${i === 0 ? 'text-white font-bold text-sm sm:text-base' : 'text-gray-400'} opacity-${100 - i*20}`}>{log}</div>
          ))}
        </div>

        {phase === 'FIGHT' && !vsFlashing && playerCard && (
          <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-auto animate-[fadeIn_0.2s_ease-out] transform-gpu">
            <div className="text-center mb-4 text-white font-black tracking-widest uppercase text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
               {turn === 'PLAYER' ? "YOUR TURN" : "ENEMY TURN"}
            </div>
            
            <div className="max-w-2xl mx-auto grid grid-cols-2 gap-2 sm:gap-4">
              {playerCard.skills!.map((skill) => {
                const isOnCooldown = playerCard!.cooldowns[skill.type] > 0;
                
                let btnStyle = "bg-blue-600 hover:bg-blue-500";
                if (skill.type === SkillType.HEAVY) btnStyle = "bg-orange-600 hover:bg-orange-500";
                if (skill.type === SkillType.DEFEND) btnStyle = "bg-green-600 hover:bg-green-500";
                if (skill.type === SkillType.ULTIMATE) btnStyle = "bg-purple-600 hover:bg-purple-500 border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.8)]";

                return (
                  <Button 
                    key={skill.type}
                    onClick={() => handlePlayerSkill(skill)} 
                    disabled={turn !== 'PLAYER' || isAnimating || isOnCooldown}
                    className={`h-16 sm:h-24 flex flex-col items-center justify-center ${btnStyle} relative group transform-gpu`}
                    title={skill.description}
                  >
                    <span className="text-sm sm:text-lg uppercase tracking-wide truncate w-full px-2">{skill.name}</span>
                    <span className="text-[10px] sm:text-xs text-white/70 bg-black/30 px-1 sm:px-2 rounded mt-1">{skill.type}</span>
                    
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs p-2 rounded w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-gray-600 text-center transform-gpu">
                      {skill.description}
                    </div>
                    
                    {isOnCooldown && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                         <span className="text-red-500 font-black text-3xl">{playerCard!.cooldowns[skill.type]} CD</span>
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {phase === 'RESULT' && playerCard && enemyCard && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[100] transform-gpu px-4">
             <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl border-2 border-slate-600 text-center max-w-md w-full shadow-2xl transform scale-100 animate-[scaleIn_0.2s_ease-out] transform-gpu">
               <h2 className={`text-4xl sm:text-5xl font-black mb-2 uppercase tracking-widest ${playerCard.currentHp > 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                 {playerCard.currentHp > 0 ? 'VICTORY!' : 'DEFEATED'}
               </h2>
               
               <p className="text-gray-400 mb-6 uppercase text-sm font-bold">
                 {playerCard.currentHp > 0 ? `Defeated ${enemyCard.rarity} Boss` : `Lost to ${enemyCard.rarity} Boss`}
               </p>
               
               {playerCard.currentHp > 0 && (
                 <div className="bg-black/50 p-4 rounded mb-6 text-left">
                   <h3 className="text-gray-400 text-sm mb-2 uppercase">Earned Rewards</h3>
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-white">Credits:</span>
                     <span className="text-green-400 font-black text-xl">+{earnedRewards.credits}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-white">Experience:</span>
                     <span className="text-blue-400 font-black text-xl">+{earnedRewards.exp}</span>
                   </div>
                 </div>
               )}

               <div className="flex flex-col gap-3">
                 {playerCard.currentHp > 0 && (
                   <Button variant="gold" onClick={handleGenerateShareImage} disabled={isGeneratingImage}>
                     {isGeneratingImage ? 'GENERATING POSTER...' : 'SHARE VICTORY POSTER'}
                   </Button>
                 )}
                 <Button onClick={() => startGame(playerCard!)}>NEXT BATTLE</Button>
                 <Button variant="secondary" onClick={() => setPhase('SELECT')}>CHANGE FIGHTER</Button>
                 <Button variant="danger" onClick={() => changeScreen(AppScreen.HOME)}>BACK TO HOME</Button>
               </div>
             </div>
          </div>
        )}

        {showShareModal && victoryImageUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 pointer-events-auto transform-gpu">
            <div className="bg-slate-800 p-6 rounded-2xl border-2 border-yellow-500 max-w-lg w-full flex flex-col items-center shadow-[0_0_50px_rgba(234,179,8,0.5)] transform-gpu">
               <h2 className="text-2xl font-black text-yellow-400 mb-4 tracking-widest text-center">EPIC VICTORY CAPTURED!</h2>
               <img src={victoryImageUrl} alt="Victory" className="w-full h-auto rounded-lg shadow-2xl mb-6 border border-white/20 transform-gpu" />
               <p className="text-gray-300 text-sm mb-6 text-center italic">AI generated via Gemini 2.5 Flash</p>
               <div className="flex gap-4 w-full">
                 <Button className="flex-1" onClick={handleShare}>SHARE / SAVE</Button>
                 <Button variant="secondary" onClick={() => setShowShareModal(false)}>CLOSE</Button>
               </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes attackMoveRight {
          0%, 100% { transform: translateX(0) scale(1.1); }
          50% { transform: translateX(50px) scale(1.15) rotate(5deg); }
        }
        @keyframes attackMoveLeft {
          0%, 100% { transform: translateX(0) scale(1.1); }
          50% { transform: translateX(-50px) scale(1.15) rotate(-5deg); }
        }
        @keyframes floatUpFade {
          0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; filter: blur(0px); }
          100% { transform: translate(-50%, -150%) scale(1); opacity: 0; filter: blur(2px); }
        }
        @keyframes flashVS {
          0% { transform: scale(10) rotate(-10deg); opacity: 0; filter: blur(10px); color: white; }
          15% { transform: scale(0.8) rotate(5deg); opacity: 1; filter: blur(0px); color: red; text-shadow: 0 0 50px red, 0 0 100px yellow; }
          30% { transform: scale(1.2) rotate(-2deg); color: white; text-shadow: 0 0 20px white; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; color: rgba(255,255,255,0.5); text-shadow: none; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
