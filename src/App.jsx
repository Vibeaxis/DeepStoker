
import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import CareerScreen from '@/components/CareerScreen';
import Dashboard from '@/components/Dashboard';
import ShiftEnd from '@/components/ShiftEnd';
import { loadCareer, saveCareer, addCredits, recordShift, updateHullIntegrity } from '@/utils/CareerProfile';
import { initializeReactor, calculateDepthCredits } from '@/utils/ReactorLogic';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { motion, AnimatePresence } from 'framer-motion';


// Add this helper function outside the App component
const loadSettings = () => {
  const saved = localStorage.getItem('deep-stoker-settings');
  return saved ? JSON.parse(saved) : {
    enableAudio: true,
    shakeIntensity: 50,
    masterVolume: 0.7
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
    const creditsCalc = calculateDepthCredits();
    
    // Calculate logic
    const avgDanger = (data.finalState.temperature + data.finalState.pressure + data.finalState.containment) / 3;
    let multiplier = 1.0;
    
    if (avgDanger < 50) multiplier = 2.0;
    else if (avgDanger < 70) multiplier = 1.5;
    else if (avgDanger < 85) multiplier = 1.2;
    
    if (!data.success) multiplier = 0.5;

    const baseCredits = Math.floor(data.survivalTime / 5);
    const totalCredits = Math.floor(baseCredits * multiplier);

    // Update persistent career using updated recordShift
    // Note: recordShift updates local storage internally
    const currentCareer = loadCareer();
    recordShift(currentCareer, data.success, data.survivalTime, totalCredits);
    
    if (data.success && data.finalState.hullIntegrity !== undefined) {
    updateHullIntegrity(currentCareer, data.finalState.hullIntegrity);
  } else {
    updateHullIntegrity(currentCareer, 100); // Auto-repair on failure
  }
    
    // Reload career to get updated stats (ranks, etc.)
    const updatedCareer = loadCareer();
    setCareer(updatedCareer);

    // Update state for ShiftEnd screen
    setShiftData({
      ...data,
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
  <div className="relative h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden font-orbitron">
    {/* Background Ambient Visual */}
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)] animate-pulse" />
    </div>

    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="z-10 text-center"
    >
      <h1 className="text-7xl font-black text-emerald-500 mb-2 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
        DEEP STOKER
      </h1>
      <p className="text-emerald-300/60 text-xs tracking-[0.5em] mb-12 uppercase">Sub-Oceanic Fusion Management</p>
      
      <div className="flex flex-col gap-4 items-center">
        <button 
          onClick={() => setCurrentScreen('career')}
          className="w-64 h-14 bg-emerald-600 hover:bg-emerald-400 text-black font-black text-lg skew-x-[-10deg] transition-all hover:scale-105"
        >
          ENTER SYSTEM
        </button>
        
        <button 
          onClick={() => setShowSettings(true)}
          className="w-64 h-12 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-bold text-sm tracking-widest"
        >
          CONFIGURATION
        </button>
      </div>
    </motion.div>
  </div>
)}

{/* Settings Overlay - Global across any screen */}
{showSettings && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 font-space-mono">
    <div className="bg-emerald-950 border-2 border-emerald-500 p-8 rounded-sm max-w-md w-full relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse" />
      
      <h2 className="text-2xl font-black text-emerald-400 mb-8 font-orbitron tracking-tighter uppercase">System Config</h2>
      
      <div className="space-y-8 mb-10">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-emerald-400 font-bold text-xs uppercase">Audio Resonance</div>
            <div className="text-[10px] text-emerald-300/50">Subtle reactor thrumming</div>
          </div>
          <button 
            onClick={() => handleUpdateSettings('enableAudio', !settings.enableAudio)}
            className={`px-6 py-1 border-2 font-black text-xs ${settings.enableAudio ? 'bg-emerald-500 text-black border-emerald-500' : 'text-emerald-500 border-emerald-500/30'}`}
          >
            {settings.enableAudio ? 'ACTIVE' : 'MUTED'}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-emerald-400">
            <span>VISUAL SWAY INTENSITY</span>
            <span>{settings.shakeIntensity}%</span>
          </div>
          <input 
            type="range" 
            min="0" max="100" 
            value={settings.shakeIntensity}
            onChange={(e) => handleUpdateSettings('shakeIntensity', e.target.value)}
            className="w-full accent-emerald-500 bg-emerald-900 h-1 appearance-none"
          />
        </div>
      </div>
      
      <button 
        onClick={() => setShowSettings(false)}
        className="w-full py-3 bg-emerald-500 text-black font-black hover:bg-white transition-colors uppercase text-sm"
      >
        Confirm Changes
      </button>
    </div>
  </div>
)}
      <Toaster />
    </AuthProvider>
  );
}

export default App;
