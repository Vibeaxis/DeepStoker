
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

  const handleStartShift = () => {
    // Re-load career to ensure fresh state
    const currentCareer = loadCareer();
    initializeReactor(currentCareer.currentRank, currentCareer.upgrades, currentCareer.hullIntegrity);
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
    
    if (data.finalState.hullIntegrity !== undefined) {
       updateHullIntegrity(currentCareer, data.finalState.hullIntegrity);
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
