export enum AppScreen {
  TITLE = 'TITLE',
  HOME = 'HOME',
  GACHA = 'GACHA',
  BATTLE = 'BATTLE',
  DECK = 'DECK'
}

export enum Rarity {
  N = 'N',
  R = 'R',
  SR = 'SR',
  SSR = 'SSR',
  UR = 'UR'
}

export enum ElementType {
  FIRE = 'Fire',
  WATER = 'Water',
  EARTH = 'Earth',
  LIGHT = 'Light',
  DARK = 'Dark'
}

export enum SkillType {
  BASIC = 'BASIC',
  HEAVY = 'HEAVY',
  DEFEND = 'DEFEND',
  ULTIMATE = 'ULTIMATE'
}

export interface Skill {
  name: string;
  type: SkillType;
  description: string;
}

export interface CardData {
  id: string;
  name: string;
  rarity: Rarity;
  element: ElementType;
  imageUrl: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  description?: string;
  isCustom?: boolean;
  skills?: Skill[];
}

export interface PlayerState {
  credits: number;
  pityCount: number;
  inventory: CardData[];
  level: number;
  exp: number;
}

export interface BannerData {
  date: string;
  featuredCards: Omit<CardData, 'id'>[];
}
