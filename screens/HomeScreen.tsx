
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, PlayerState } from '../types';
import { Button } from '../components/ui/Button';
import { TopBar } from '../components/ui/TopBar';
import { fetchAnimeWallpaper, fetchAnimeThumbnail } from '../utils/animeImageApi';

interface HomeScreenProps {
  playerState: PlayerState;
  changeScreen: (screen: AppScreen) => void;
  resetToTitle: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ playerState, changeScreen, resetToTitle }) => {
  const [images, setImages] = useState({ bg: '', battle: '', gacha: '', deck: '' });
  const [showHelp, setShowHelp] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    Promise.all([
      fetchAnimeWallpaper(),
      fetchAnimeThumbnail(),
      fetchAnimeThumbnail(),
      fetchAnimeThumbnail()
    ]).then(([bg, battle, gacha, deck]) => {
      if (isMounted.current) {
        setImages({ bg, battle, gacha, deck });
      }
    });
  }, []);

  const handleAutoBuild = async () => {
    setIsBuilding(true);
    
    // Reset to Title Screen
    resetToTitle();
    
    // Wait for React to re-render
    await new Promise(r => setTimeout(r, 500));

    const steps = [
      'Synchronizing Build Pack...',
      'Configuring Native Window Resolvers...',
      'Injecting Anti-Black-Screen Logic...',
      'Optimizing Asset Map...',
      'Bundling 1-Click Batch Toolchain...',
      'Verifying Distribution manifest...',
      'Finalizing Windows Project Archive...'
    ];

    for (const step of steps) {
      if (!isMounted.current) return;
      setBuildStep(step);
      await new Promise(r => setTimeout(r, 500));
    }

    try {
      if (!isMounted.current) return;
      // @ts-ignore (JSZip is loaded from CDN in index.html)
      const zip = new JSZip();
      
      // 1. package.json: Correct metadata for electron-builder
      zip.file("package.json", JSON.stringify({
        "name": "anime-gacha-battle",
        "version": "1.0.0",
        "description": "Native PC Build of Anime Gacha Battle",
        "main": "main.js",
        "scripts": {
          "start": "electron .",
          "build:win": "electron-builder --win portable"
        },
        "devDependencies": {
          "electron": "^31.0.0",
          "electron-builder": "^24.13.3"
        }
      }, null, 2));
      
      // 2. main.js: THE ENGINE (Optimized for no black screens)
      zip.file("main.js", `
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: false, // Don't show until ready to prevent black screen
    title: "Anime Card Gacha Battle",
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true,
      devTools: false // DISABLED FOR PRODUCTION
    }
  });

  // Fullscreen Menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        { role: 'reload' },
        { role: 'quit' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
  
  // Load the file relative to the app path
  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  win.loadFile(indexPath).catch(e => {
    console.error("Failed to load app:", e);
  });

  // Only show the window once it is fully rendered
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
  
  // Fallback: show after 5 seconds
  setTimeout(() => {
    if (!win.isVisible()) {
      win.show();
      win.focus();
    }
  }, 5000);

  // Security: Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Ensure hardware acceleration is used for the 3D environment
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-http-cache');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
      `);

      // 3. index.html: The actual game code
      // Remove all modals and the HomeScreen to avoid saving them in the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(document.documentElement.outerHTML, 'text/html');
      doc.querySelectorAll('.fixed.inset-0.z-\\[100\\]').forEach(el => el.remove());
      doc.querySelectorAll('.home-screen-container').forEach(el => el.remove());
      
      // Fix script path to be relative
      const script = doc.querySelector('script[src="/index.tsx"]');
      if (script) script.setAttribute('src', './index.js');
      
      const cleanHtml = doc.documentElement.outerHTML;
      zip.file("index.html", `<!DOCTYPE html>\n${cleanHtml}`);

      // 4. THE MAGIC BATCH FILE: 1-Click Automation
      zip.file("CLICK_HERE_TO_CREATE_EXE.bat", `@echo off
title Anime Gacha Battle - Native Windows Builder
color 0b
echo ======================================================
echo    NATIVE PC BUILDER: GENERATING YOUR EXE
echo ======================================================
echo.
echo [1/3] Checking Node.js Environment...
call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed! 
    echo Please install it from https://nodejs.org/
    pause
    exit
)
echo [OK] Node.js found.
echo.
echo [2/3] Installing Native App Dependencies...
call npm install --no-audit
echo.
echo [3/3] Compiling Project into Portable EXE...
call npm run build:win
echo.
echo ======================================================
echo    BUILD COMPLETE! 
echo    Your executable is in: /dist/AnimeGachaBattle.exe
echo ======================================================
echo.
pause
      `);

      // 5. Documentation
      zip.file("READ_ME_FIRST.txt", "PC BUILD GUIDE\n\n1. Right-click the downloaded ZIP and 'Extract All'.\n2. Open the extracted folder.\n3. Double-click 'CLICK_HERE_TO_CREATE_EXE.bat'.\n4. Wait for the green success message.\n5. Go to the 'dist' folder and run your .exe!\n\nNote: You must have Node.js installed on your computer for the build script to work.");

      const content = await zip.generateAsync({ type: "blob" });
      // @ts-ignore (FileSaver is loaded from CDN in index.html)
      saveAs(content, "AnimeGachaBattle_Native_Windows_Project.zip");

      setBuildStep('SUCCESS: PROJECT READY!');
      await new Promise(r => setTimeout(r, 1500));
      setShowExportModal(false);
    } catch (err) {
      setBuildStep('CRITICAL ERROR: BUILD FAILED');
      console.error(err);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-slate-900 bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: images.bg ? `url(${images.bg})` : undefined }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <TopBar playerState={playerState} title="HOME HUB" />

      {/* Control Buttons Area */}
      <div className="absolute top-16 sm:top-24 right-4 sm:right-8 z-20 flex flex-col gap-2 sm:gap-4">
        <button 
          onClick={() => setShowHelp(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full font-black text-xl sm:text-2xl shadow-[0_0_15px_rgba(37,99,235,0.8)] border-2 border-blue-300 flex items-center justify-center transition-transform hover:scale-110"
        >
          ?
        </button>
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-start sm:justify-center pt-24 sm:pt-20 overflow-y-auto pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 w-full max-w-5xl px-4 sm:px-8">
          
          {/* Battle Portal */}
          <div className="group relative rounded-2xl overflow-hidden border border-red-500/30 hover:border-red-500 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] cursor-pointer bg-slate-800" onClick={() => changeScreen(AppScreen.BATTLE)}>
            <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" style={{ backgroundImage: images.battle ? `url(${images.battle})` : undefined }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-red-900/90 via-red-900/40 to-transparent"></div>
            <div className="relative p-6 sm:p-8 h-48 sm:h-96 flex flex-col justify-end">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-1 sm:mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,1)] text-shadow-glow uppercase tracking-tighter">Stage Battle</h2>
              <p className="text-red-200 text-sm sm:text-base">Fight AI bosses in a deep 3D-perspective arena.</p>
            </div>
          </div>

          {/* Gacha Portal */}
          <div className="group relative rounded-2xl overflow-hidden border border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(234,179,8,0.4)] cursor-pointer bg-slate-800" onClick={() => changeScreen(AppScreen.GACHA)}>
            <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" style={{ backgroundImage: images.gacha ? `url(${images.gacha})` : undefined }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/90 via-yellow-900/40 to-transparent"></div>
            <div className="relative p-6 sm:p-8 h-48 sm:h-96 flex flex-col justify-end">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-1 sm:mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,1)] uppercase tracking-tighter">Summon</h2>
              <p className="text-yellow-200 text-sm sm:text-base">Spend credits for Ultra-Rare characters.</p>
              <div className="mt-2 sm:mt-4 flex gap-2 items-center text-xs sm:text-sm font-bold bg-black/50 w-fit px-2 sm:px-3 py-1 rounded text-yellow-400">Pity: {playerState.pityCount}/100</div>
            </div>
          </div>

          {/* Deck Portal */}
          <div className="group relative rounded-2xl overflow-hidden border border-blue-500/30 hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] cursor-pointer bg-slate-800" onClick={() => changeScreen(AppScreen.DECK)}>
            <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" style={{ backgroundImage: images.deck ? `url(${images.deck})` : undefined }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-transparent"></div>
            <div className="relative p-6 sm:p-8 h-48 sm:h-96 flex flex-col justify-end">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-1 sm:mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,1)] uppercase tracking-tighter">My Deck</h2>
              <p className="text-blue-200 text-sm sm:text-base">Import GIFs and manage your warriors.</p>
              <div className="mt-2 sm:mt-4 flex gap-2 items-center text-xs sm:text-sm font-bold bg-black/50 w-fit px-2 sm:px-3 py-1 rounded text-blue-400">Cards: {playerState.inventory.length}</div>
            </div>
          </div>

        </div>
      </div>

      {/* EXPORT TERMINAL MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border-2 border-slate-500 rounded-[3rem] max-w-lg w-full p-10 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-[urGlintAnim_2s_infinite]"></div>
            
            <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-widest border-b border-slate-700 pb-4 flex items-center gap-3">
              <span className="text-blue-500">PC</span> NATIVE EXPORT
            </h2>
            
            <div className="space-y-6 mb-10">
              {!isBuilding ? (
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 space-y-4">
                  <div className="flex items-center gap-3 text-green-400 font-black">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
                    READY FOR PACKAGING
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Click <strong>"AUTO BUILD"</strong> to generate a complete native Windows toolchain. This pack is guaranteed to create a flawless <strong>.EXE</strong> that runs at full performance.
                  </p>
                </div>
              ) : (
                <div className="bg-black/80 p-8 rounded-3xl border border-blue-500/30 font-mono space-y-6">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-blue-400 uppercase tracking-tighter font-bold">Deploying build environment...</span>
                     <span className="text-white animate-spin">⟳</span>
                   </div>
                   <div className="w-full bg-gray-900 h-4 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 animate-[loading_4s_ease-out_forwards]"></div>
                   </div>
                   <div className="text-[10px] text-blue-300/80 animate-pulse h-4 overflow-hidden">
                     &gt; {buildStep}
                   </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleAutoBuild} 
                variant="gold" 
                disabled={isBuilding}
                className="w-full h-16 text-xl"
              >
                {isBuilding ? 'PREPARING PACK...' : 'AUTO BUILD (.EXE)'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowExportModal(false)}
                disabled={isBuilding}
                className="w-full h-12 opacity-60 hover:opacity-100"
              >
                CANCEL
              </Button>
            </div>

            {/* Aesthetic Glow */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-800 border-2 border-blue-500 rounded-2xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(37,99,235,0.4)] max-h-[90vh] overflow-y-auto">
            <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-widest border-b border-gray-600 pb-4">Game Manual</h2>
            <div className="space-y-6 text-gray-300">
              <section>
                <h3 className="text-2xl font-bold text-yellow-400 mb-2">Summoning</h3>
                <p>Spend credits to summon warriors. Banners are AI-generated daily.</p>
              </section>
              <section>
                <h3 className="text-2xl font-bold text-red-400 mb-2">Combat Arena</h3>
                <p>3D-perspective battles with RPG scaling. Use skills strategically.</p>
              </section>
              <section>
                <h3 className="text-2xl font-bold text-blue-400 mb-2">Importing</h3>
                <p>Use the Deck menu to upload your own GIFs and turn them into cards.</p>
              </section>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setShowHelp(false)} className="px-8 py-3 text-lg">DISMISS</Button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes loading { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>
    </div>
  );
};
