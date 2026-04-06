import { FALLBACK_IMAGES } from '../constants';

export const getRandomAnimeImage = async (seed?: string): Promise<string> => {
  const endpoints = [
    'https://api.waifu.pics/sfw/waifu',
    'https://api.waifu.pics/sfw/neko',
    'https://nekos.best/api/v2/neko',
    'https://nekos.best/api/v2/waifu'
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    try {
      const data = await res.json();
      if (data.url) return data.url;
      if (data.results && data.results[0].url) return data.results[0].url;
    } catch (e) {
      console.warn("Failed to parse JSON from anime API", e);
    }
  } catch (e) {
    console.warn("Anime API fetch slow/failed, using instant fallback...", e);
  }

  // Fallback to stylized seed avatars if API rate limited or offline
  if (seed) {
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;
  }
  
  // Final static fallback
  return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
};

export const fetchAnimeWallpaper = async (): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://nekos.life/api/v2/img/wallpaper', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (e) {
    console.warn("Nekos wallpaper API slow/failed, trying fallback...", e);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.waifu.pics/sfw/waifu', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (e) {
    console.warn("Waifu API failed", e);
  }
  
  const landscapeFallbacks = [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=1920&h=1080',
    'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1920&h=1080',
    'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=1920&h=1080'
  ];
  return landscapeFallbacks[Math.floor(Math.random() * landscapeFallbacks.length)];
};

export const fetchAnimeThumbnail = async (): Promise<string> => {
  const endpoints = [
    'https://api.waifu.pics/sfw/waifu',
    'https://nekos.best/api/v2/neko',
    'https://api.waifu.pics/sfw/neko'
  ];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
      if (data.results && data.results[0].url) return data.results[0].url;
    }
  } catch (e) {
    console.warn("Thumbnail API slow/failed, using instant fallback...", e);
  }
  
  return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
};
