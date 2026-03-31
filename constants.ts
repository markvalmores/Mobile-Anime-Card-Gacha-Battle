import { Rarity } from './types';

export const GACHA_COST_SINGLE = 100;
export const GACHA_COST_TEN = 1000;
export const PITY_THRESHOLD = 100;

export const RARITY_RATES = {
  [Rarity.UR]: 0.01,  // 1%
  [Rarity.SSR]: 0.04, // 4%
  [Rarity.SR]: 0.15,  // 15%
  [Rarity.R]: 0.30,   // 30%
  [Rarity.N]: 0.50    // 50%
};

// Base stats multipliers (Balanced to prevent 1-hit kills)
export const RARITY_STATS = {
  [Rarity.N]:   { hp: 400, atk: 25, def: 15 },
  [Rarity.R]:   { hp: 1000, atk: 55, def: 35 },
  [Rarity.SR]:  { hp: 2500, atk: 140, def: 80 },
  [Rarity.SSR]: { hp: 6000, atk: 350, def: 200 },
  [Rarity.UR]:  { hp: 15000, atk: 850, def: 450 }
};

// Genuine balanced sell system
export const RARITY_SELL_VALUES = {
  [Rarity.N]: 10,
  [Rarity.R]: 50,
  [Rarity.SR]: 250,
  [Rarity.SSR]: 800,
  [Rarity.UR]: 3000
};

// Genuine balanced earn system per stage completion
export const BATTLE_REWARDS = {
  [Rarity.N]: { exp: 50, credits: 100 },
  [Rarity.R]: { exp: 120, credits: 250 },
  [Rarity.SR]: { exp: 300, credits: 600 },
  [Rarity.SSR]: { exp: 800, credits: 1500 },
  [Rarity.UR]: { exp: 2000, credits: 5000 }
};

export const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=400&h=600',
  'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=400&h=600',
  'https://images.unsplash.com/photo-1580477667995-2b92001ced15?auto=format&fit=crop&q=80&w=400&h=600',
  'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?auto=format&fit=crop&q=80&w=400&h=600',
  'https://images.unsplash.com/photo-1560972550-aba3456b5564?auto=format&fit=crop&q=80&w=400&h=600'
];
