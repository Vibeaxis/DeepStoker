
import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import CareerScreen from '@/components/CareerScreen';
import Dashboard from '@/components/Dashboard';
import ShiftEnd from '@/components/ShiftEnd';
import { loadCareer, saveCareer, addCredits, recordShift, updateHullIntegrity } from '@/utils/CareerProfile';
import { initializeReactor, calculateDepthCredits } from '@/utils/ReactorLogic';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';

function App() {
  const [currentScreen, setCurrentScreen] = useState('career');
  const [career, setCareer] = useState(null);
  const [shiftData, setShiftData] = useState(null);

  useEffect(() => {
    const loadedCareer = loadCareer();
    setCareer(loadedCareer);
  }, []);

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
      
      <Toaster />
    </AuthProvider>
  );
}

export default App;
