
import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import CareerScreen from '@/components/CareerScreen';
import Dashboard from '@/components/Dashboard';
import ShiftEnd from '@/components/ShiftEnd';
import { loadCareer, saveCareer, addCredits, recordShift, updateHullIntegrity } from '@/utils/CareerProfile';
import { initializeReactor, calculateDepthCredits } from '@/utils/ReactorLogic';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { motion, AnimatePresence } from 'framer-motion';


// 1. UPDATED SETTINGS LOADER
const loadSettings = () => {
  const saved = localStorage.getItem('deep-stoker-settings');
  return saved ? JSON.parse(saved) : {
    enableAudio: true,
    shakeIntensity: 50,
    masterVolume: 0.7,
    gamma: 1.0,      // New: Brightness (0.5 to 1.5)
    uiScale: 100     // New: Font/UI size percentage (80 to 120)
  };
};



function App() {
 const [currentScreen, setCurrentScreen] = useState('title');
  const [career, setCareer] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [settings, setSettings] = useState(loadSettings());
// Add a state for the settings overlay toggle
const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const loadedCareer = loadCareer();
    setCareer(loadedCareer);
  }, []);
// Helper to update settings and save to local storage
const handleUpdateSettings = (key, value) => {
  const newSettings = { ...settings, [key]: value };
  setSettings(newSettings);
  localStorage.setItem('deep-stoker-settings', JSON.stringify(newSettings));
};
 const handleStartShift = (shiftType = 'standard') => {
  // 1. Re-load career to ensure fresh state (Keep this!)
  const currentCareer = loadCareer();

  // 2. Define our new Shift/Level logic
  const shiftDurations = { quick: 180, standard: 300, deep: 600 };
  const isLevel2 = currentCareer.upgrades.includes("Level 2 Clearance");

  // 3. Update the initialize call to handle the new "Level 2" Star reactor
  // We pass the shift duration and the reactor type (Star vs Circle)
  initializeReactor(
    currentCareer.currentRank, 
    currentCareer.upgrades, 
    currentCareer.hullIntegrity,
    {
      duration: shiftDurations[shiftType],
      reactorType: isLevel2 ? 'star' : 'circle', // THE LEVEL 2 TOGGLE
      difficultyMult: shiftType === 'deep' ? 3.0 : 1.0
    }
  );

  setCurrentScreen('shift');
};

const handleShiftEnd = (data) => {
    console.log("Shift End Data Received:", data); // Debugging line

    // 1. DEFENSIVE CODING: Ensure we have an object to work with
    const safeData = data || {};
    
    // 2. NORMALIZE FINAL STATE
    // If finalState is missing, try to use safeData itself, or fallback to empty object
    const finalState = safeData.finalState || safeData || {};
    
    // 3. SAFE EXTRACTION (The Crash Fix)
    // Use '?? 0' so if pressure is undefined, it becomes 0 instead of crashing
    const temp = finalState.temperature ?? 0;
    const press = finalState.pressure ?? 0;
    const cont = finalState.containment ?? 0;
    const hull = finalState.hullIntegrity ?? 0;

    // 4. CALCULATE LOGIC
    const avgDanger = (temp + press + cont) / 3;
    
    let multiplier = 1.0;
    if (avgDanger < 50) multiplier = 2.0;
    else if (avgDanger < 70) multiplier = 1.5;
    else if (avgDanger < 85) multiplier = 1.2;
    
    // Check success safely
    if (!safeData.success) multiplier = 0.5;

    // Check multiplier safely
    const shiftMultiplier = finalState.difficultyMult || 1.0;

    // Check survival time safely
    const survivalTime = safeData.survivalTime || 0;

    const baseCredits = Math.floor(survivalTime / 5);
    const totalCredits = Math.floor(baseCredits * multiplier * shiftMultiplier);

    // 5. SAVE TO CAREER
    const currentCareer = loadCareer();
    recordShift(currentCareer, safeData.success, survivalTime, totalCredits);
    
    // Only update hull if we actually have data, otherwise assume 100 or current
    if (safeData.success) {
      updateHullIntegrity(currentCareer, hull);
    } else {
      // On failure, maybe force a penalty or keep as is. 
      // Safest is to just use what's in finalState or default to 0.
      updateHullIntegrity(currentCareer, hull); 
    }
    
    const updatedCareer = loadCareer();
    setCareer(updatedCareer);

    // 6. UPDATE UI STATE
    setShiftData({
      ...safeData,
      finalState: {
        temperature: temp,
        pressure: press,
        containment: cont,
        hullIntegrity: hull,
        difficultyMult: shiftMultiplier
      },
      creditsEarned: totalCredits
    });

    setCurrentScreen('shift-end');
  };

  const handleReturnToCareer = () => {
    const updatedCareer = loadCareer();
    setCareer(updatedCareer);
    
    setCurrentScreen('career');
    setShiftData(null);
  };

  const handleCareerUpdate = () => {
    const updatedCareer = loadCareer();
    setCareer(updatedCareer);
  };

  if (!career) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 to-cyan-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

 return (
    <AuthProvider>
      {/* WRAP EVERYTHING IN A DIV THAT APPLIES SETTINGS */}
      <div className="min-h-screen w-full transition-all duration-300" style={appStyles}>
        
        {currentScreen === 'career' && (
          <CareerScreen 
            career={career} 
            onStartShift={handleStartShift}
            onCareerUpdate={handleCareerUpdate}
          />
        )}
        
        {currentScreen === 'shift' && (
          <Dashboard 
            career={career}
            onShiftEnd={handleShiftEnd}
            // PASS SETTINGS TRIGGER DOWN
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        
        {currentScreen === 'shift-end' && shiftData && (
          <ShiftEnd 
            shiftData={shiftData}
            onReturnToCareer={handleReturnToCareer}
            onCareerUpdate={handleCareerUpdate}
          />
        )}

        {/* Title Screen Branch */}
        {currentScreen === 'title' && (
           /* ... Your Title Screen Code ... */
           <div className="relative h-screen w-full flex flex-col items-center justify-center bg-black font-orbitron">
             <h1 className="text-6xl text-emerald-500 mb-8">DEEP STOKER</h1>
             <button onClick={() => setCurrentScreen('career')} className="px-8 py-4 bg-emerald-600 text-black font-bold mb-4">ENTER</button>
             <button onClick={() => setShowSettings(true)} className="text-emerald-500 border-b border-emerald-500">CONFIG</button>
           </div>
        )}

        {/* 3. UPDATED SETTINGS OVERLAY */}
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 font-space-mono">
            <div className="bg-emerald-950 border-2 border-emerald-500 p-8 rounded-sm max-w-md w-full relative shadow-[0_0_50px_rgba(16,185,129,0.2)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse" />
              
              <h2 className="text-2xl font-black text-emerald-400 mb-8 font-orbitron tracking-tighter uppercase">System Config</h2>
              
              <div className="space-y-8 mb-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Audio */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-emerald-400 font-bold text-xs uppercase">Audio Resonance</div>
                    <div className="text-[10px] text-emerald-300/50">Reactor thrumming</div>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings('enableAudio', !settings.enableAudio)}
                    className={`px-4 py-1 border-2 font-black text-xs ${settings.enableAudio ? 'bg-emerald-500 text-black border-emerald-500' : 'text-emerald-500 border-emerald-500/30'}`}
                  >
                    {settings.enableAudio ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Shake */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-emerald-400">
                    <span>SCREEN SHAKE</span>
                    <span>{settings.shakeIntensity}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={settings.shakeIntensity}
                    onChange={(e) => handleUpdateSettings('shakeIntensity', e.target.value)}
                    className="w-full accent-emerald-500 bg-emerald-900 h-1 appearance-none"
                  />
                </div>

                {/* Gamma Correction */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-emerald-400">
                    <span>GAMMA CORRECTION</span>
                    <span>{Math.round(settings.gamma * 100)}%</span>
                  </div>
                  <div className="text-[10px] text-emerald-300/50 mb-1">Adjust visibility in deep waters</div>
                  <input 
                    type="range" min="0.5" max="1.5" step="0.1"
                    value={settings.gamma}
                    onChange={(e) => handleUpdateSettings('gamma', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-emerald-900 h-1 appearance-none"
                  />
                </div>

                {/* UI Scale */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-emerald-400">
                    <span>UI SCALING</span>
                    <span>{settings.uiScale}%</span>
                  </div>
                  <div className="text-[10px] text-emerald-300/50 mb-1">Resize text and controls</div>
                  <input 
                    type="range" min="80" max="120" step="5"
                    value={settings.uiScale}
                    onChange={(e) => handleUpdateSettings('uiScale', parseInt(e.target.value))}
                    className="w-full accent-emerald-500 bg-emerald-900 h-1 appearance-none"
                  />
                </div>

              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-emerald-500 text-black font-black hover:bg-white transition-colors uppercase text-sm skew-x-[-10deg]"
              >
                Apply & Return
              </button>
            </div>
          </div>
        )}
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
