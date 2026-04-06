import { GoogleGenAI, Type } from '@google/genai';
import { BannerData, ElementType, Rarity, SkillType, Skill } from '../types';
import { getRandomAnimeImage } from '../utils/animeImageApi';

const cleanJSON = (text: string) => {
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
  if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
  if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
  return cleanText.trim();
};

// --- BACKGROUND AI POOLING ENGINE ---
// Uses CPU/Network in the background to pre-generate profiles, making UI responses INSTANT.
let profilePool: CardProfile[] = [];
let isFillingPool = false;

export const preloadAIProfiles = async () => {
  if (isFillingPool || profilePool.length > 15) return;
  isFillingPool = true;
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("No Gemini API key found in environment.");
    isFillingPool = false;
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Generate exactly 5 unique anime character profiles with random elements (Fire, Water, Earth, Light, Dark). 
  For each character:
  1. Provide a highly unique, cool, and authentic Japanese Romaji name.
  2. Provide a short, epic character summary/lore description.
  3. Provide 4 epic and uniquely named combat skills that match their element: 1 basic attack, 1 heavy attack, 1 defensive move, and 1 ultimate move.
  4. Include a short description for what each skill does mechanically.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              basicAttackName: { type: Type.STRING },
              basicAttackDesc: { type: Type.STRING },
              heavyAttackName: { type: Type.STRING },
              heavyAttackDesc: { type: Type.STRING },
              defensiveSkillName: { type: Type.STRING },
              defensiveSkillDesc: { type: Type.STRING },
              ultimateSkillName: { type: Type.STRING },
              ultimateSkillDesc: { type: Type.STRING }
            },
            required: ["name", "description", "basicAttackName", "basicAttackDesc", "heavyAttackName", "heavyAttackDesc", "defensiveSkillName", "defensiveSkillDesc", "ultimateSkillName", "ultimateSkillDesc"]
          }
        }
      }
    });

    if (response.text) {
       const profiles = JSON.parse(cleanJSON(response.text));
       if (Array.isArray(profiles)) {
          const formatted = profiles.map((p: any) => ({
            name: p.name,
            description: p.description,
            skills: [
              { type: SkillType.BASIC, name: p.basicAttackName, description: p.basicAttackDesc },
              { type: SkillType.HEAVY, name: p.heavyAttackName, description: p.heavyAttackDesc },
              { type: SkillType.DEFEND, name: p.defensiveSkillName, description: p.defensiveSkillDesc },
              { type: SkillType.ULTIMATE, name: p.ultimateSkillName, description: p.ultimateSkillDesc }
            ]
          }));
          profilePool.push(...formatted);
       }
    }
  } catch (error: any) {
    console.warn("Background AI pre-fetch silent fail:", error);
  }
  isFillingPool = false;
};

// Trigger pool fill immediately on module load
preloadAIProfiles();


export const generateProceduralName = () => {
  const firstNames = ["Ryu", "Ken", "Akira", "Sora", "Kaito", "Haru", "Ren", "Yuki", "Shiro", "Kuro", "Hikaru", "Makoto", "Shin", "Zero", "Kage", "Jin", "Kazuya", "Ayame", "Sakura", "Hinata", "Kaori", "Misaki", "Rei", "Asuka", "Takeshi", "Hayate", "Ryuunosuke", "Kenshin", "Kagura", "Takeru", "Ryoko"];
  const lastNames = ["Kusanagi", "Kazama", "Mishima", "Yagami", "Shiramine", "Kurogane", "Aotsuki", "Akatsuki", "Mikazuchi", "Takahashi", "Suzuki", "Watanabe", "Yamamoto", "Nakamura", "Kobayashi", "Sasaki", "Matsumoto", "Inoue", "Himura", "Matoi", "Uzuki", "Amamiya"];
  const randSuffix = Math.random() > 0.85 ? ` ${['Prime', 'Alter', 'Zero', 'Omega', 'Kai'][Math.floor(Math.random()*5)]}` : '';
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}${randSuffix}`;
};

export const generateProceduralDescription = (element: ElementType, name: string): string => {
  const templates = [
    `A legendary ${element} warrior known for unmatched prowess on the battlefield. Few survive a direct encounter with ${name}.`,
    `Hailing from the hidden ${element} realms, ${name} strikes fear into the hearts of enemies with unpredictable tactics.`,
    `Armed with the ancient power of ${element}, this combatant bows to no one. They wander the shattered earth seeking worthy foes.`,
    `A wandering soul infused with volatile ${element} energy, seeking the ultimate challenge to test their limits.`,
    `Stories speak of a ${element} entity that single-handedly turned the tide of the Great War. That entity is undeniably ${name}.`,
    `Forged in the deepest, most treacherous parts of the ${element} domain, ${name} is considered an unstoppable force of nature.`,
    `Once a mere mortal, an anomaly in the matrix transformed them into a vessel of pure ${element} destruction.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
};

export const generateProceduralSkills = (element: ElementType, charName: string): Skill[] => {
  const elementalAdjectives: Record<ElementType, string[]> = {
    [ElementType.FIRE]: ["Infernal", "Scorching", "Blazing", "Volcanic", "Pyro", "Cinder", "Ash", "Sunflare", "Magma", "Ignis"],
    [ElementType.WATER]: ["Tidal", "Abyssal", "Glacial", "Hydro", "Crystal", "Frost", "Oceanic", "Leviathan", "Torrential", "Aqua"],
    [ElementType.EARTH]: ["Seismic", "Obsidian", "Terra", "Gaia", "Tectonic", "Bedrock", "Ironclad", "Meteor", "Geo", "Quake"],
    [ElementType.LIGHT]: ["Radiant", "Luminous", "Celestial", "Holy", "Divine", "Aurelian", "Prismatic", "Stellar", "Astral", "Halo"],
    [ElementType.DARK]: ["Umbral", "Void", "Abyssal", "Phantom", "Nether", "Shadow", "Eclipse", "Doom", "Onyx", "Stygian"]
  };
  
  const basicNouns = ["Strike", "Slash", "Bolt", "Dart", "Fang", "Claw", "Edge", "Pulse", "Whip", "Jab"];
  const heavyNouns = ["Buster", "Crash", "Impact", "Smash", "Breaker", "Crusher", "Driver", "Hammer", "Force", "Execution"];
  const defendNouns = ["Guard", "Shield", "Aegis", "Barrier", "Ward", "Phalanx", "Wall", "Veil", "Sanctuary", "Carapace"];
  const ultNouns = ["Nova", "Cataclysm", "Oblivion", "Genesis", "Requiem", "Annihilation", "Apocalypse", "Vortex", "Ragnarok", "Singularity"];

  const e = elementalAdjectives[element];
  const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  
  const shortName = charName.split(' ')[0] || charName;

  return [
    { type: SkillType.BASIC, name: `${rand(e)} ${rand(basicNouns)}`, description: `Channels raw ${element} energy into a swift basic attack. Reliable and fast.` },
    { type: SkillType.HEAVY, name: `${shortName}'s ${rand(heavyNouns)}`, description: `A devastating, momentum-heavy blow that crushes enemy defenses dealing 1.8x damage. (2-turn CD)` },
    { type: SkillType.DEFEND, name: `${rand(e)} ${rand(defendNouns)}`, description: `Summons a dense protective aura of ${element}, granting a massive shield based on max HP. (2-turn CD)` },
    { type: SkillType.ULTIMATE, name: `Absolute ${rand(ultNouns)}`, description: `Unleashes the full terrifying potential of ${name}, obliterating the battlefield for 2.5x damage. (4-turn CD)` }
  ];
};

export interface CardProfile {
  name: string;
  description: string;
  skills: Skill[];
}

export const generateVictoryImage = async (name: string, element: ElementType, currentHp: number): Promise<string | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Anime style trading card of a victorious ${element} warrior named ${name}. The image should look like an epic celebratory end-of-battle screen. Include glowing text overlay clearly showing "VICTORY" and "${currentHp} HP". High quality, digital art, masterpiece.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Failed to generate victory image:", error);
  }
  return null;
};

export const fetchDailyBanner = async (): Promise<BannerData | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().split('T')[0];

  const prompt = `
    Generate a new unique daily gacha banner featuring 2 anime-style characters.
    One must be of rarity "UR" (Ultra Rare) and one "SSR" (Super Super Rare).
    Give them highly unique, cool, and authentic Japanese Romaji names.
    Provide a short, epic character summary.
    Also provide 4 distinct skill names for each fitting their element.
    Provide realistic RPG stats based on rarity (UR: ~15000 HP, ~850 ATK, ~450 DEF. SSR: ~6000 HP, ~350 ATK, ~200 DEF).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              rarity: { type: Type.STRING },
              element: { type: Type.STRING },
              description: { type: Type.STRING },
              hp: { type: Type.INTEGER },
              attack: { type: Type.INTEGER },
              defense: { type: Type.INTEGER },
              skillBasicName: { type: Type.STRING },
              skillBasicDesc: { type: Type.STRING },
              skillHeavyName: { type: Type.STRING },
              skillHeavyDesc: { type: Type.STRING },
              skillDefendName: { type: Type.STRING },
              skillDefendDesc: { type: Type.STRING },
              skillUltimateName: { type: Type.STRING },
              skillUltimateDesc: { type: Type.STRING }
            },
            required: ["name", "rarity", "element", "description", "hp", "attack", "defense", "skillBasicName", "skillBasicDesc", "skillHeavyName", "skillHeavyDesc", "skillDefendName", "skillDefendDesc", "skillUltimateName", "skillUltimateDesc"]
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(cleanJSON(response.text));
      const featuredCards = await Promise.all(parsed.map(async (c: any) => {
        const el = Object.values(ElementType).includes(c.element) ? c.element as ElementType : ElementType.LIGHT;
        return {
          name: c.name,
          rarity: c.rarity as Rarity,
          element: el,
          description: c.description,
          hp: c.hp,
          maxHp: c.hp,
          attack: c.attack,
          defense: c.defense,
          imageUrl: await getRandomAnimeImage(c.name),
          skills: [
            { type: SkillType.BASIC, name: c.skillBasicName, description: c.skillBasicDesc },
            { type: SkillType.HEAVY, name: c.skillHeavyName, description: c.skillHeavyDesc },
            { type: SkillType.DEFEND, name: c.skillDefendName, description: c.skillDefendDesc },
            { type: SkillType.ULTIMATE, name: c.skillUltimateName, description: c.skillUltimateDesc }
          ]
        };
      }));
      return { date: today, featuredCards };
    }
  } catch (error: any) {
    console.warn("Failed to generate banner", error);
  }
  return null;
};

// NOW INSTANT: Uses the pre-generated background pool or local procedural generator instantly
export const generateCardProfiles = async (count: number, elements: ElementType[]): Promise<CardProfile[]> => {
  // Trigger pool refill asynchronously in background
  if (profilePool.length < 5) preloadAIProfiles();

  const results: CardProfile[] = [];
  for (let i = 0; i < count; i++) {
    const el = elements[i] || ElementType.LIGHT;
    
    // Attempt to pull a high-quality pre-generated profile from pool
    if (profilePool.length > 0) {
      const profile = profilePool.shift()!;
      results.push(profile);
    } else {
      // Instant Local Procedural Fallback if pool is empty
      const name = generateProceduralName();
      results.push({
        name,
        description: generateProceduralDescription(el, name),
        skills: generateProceduralSkills(el, name)
      });
    }
  }
  return results;
};