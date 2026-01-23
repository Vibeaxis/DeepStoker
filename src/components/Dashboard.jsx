
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import EmergencyPurgeButton from './EmergencyPurgeButton';
import StructuralStabilityMeter from './StructuralStabilityMeter';
import CornerCracks from './CornerCracks';
import PauseButton from './PauseButton';
import CRTStaticOverlay from './CRTStaticOverlay';
import { 
  startReactorLoop, 
  stopReactorLoop, 
  applyControl, 
  getReactorState, 
  playSuccessChime,
  triggerEmergencyPurge,
  playLowFrequencyAlarm,
  togglePause
} from '@/utils/ReactorLogic';

const SHIFT_DURATION = 300; // 5 minutes in seconds

const REACTOR_CORE_STYLES = `
  .reactor-core {
    width: 22vh !important; 
    height: 22vh !important;
    border-radius: 50%;
    position: relative;
    z-index: 20;
    transition: transform 0.3s ease;
  }
  
  .reactor-core.blue {
    background: radial-gradient(circle, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%);
    box-shadow: 
      0 0 30px rgba(59, 130, 246, 0.6),
      0 0 60px rgba(59, 130, 246, 0.4),
      0 0 90px rgba(59, 130, 246, 0.2),
      inset 0 0 30px rgba(147, 197, 253, 0.3);
  }
  
  .reactor-core.orange {
    background: radial-gradient(circle, #f59e0b 0%, #d97706 50%, #b45309 100%);
    box-shadow: 
      0 0 30px rgba(245, 158, 11, 0.6),
      0 0 60px rgba(245, 158, 11, 0.4),
      0 0 90px rgba(245, 158, 11, 0.2),
      inset 0 0 30px rgba(253, 186, 116, 0.3);
  }
  
  .reactor-core.red {
    background: radial-gradient(circle, #ef4444 0%, #dc2626 50%, #991b1b 100%);
    box-shadow: 
      0 0 45px rgba(239, 68, 68, 0.8),
      0 0 75px rgba(239, 68, 68, 0.6),
      0 0 105px rgba(239, 68, 68, 0.4),
      inset 0 0 30px rgba(252, 165, 165, 0.4);
  }
  
  .water-ripple {
    width: 100%;
    height: 100%;
    background: radial-gradient(ellipse at center, transparent 0%, rgba(10, 95, 127, 0.3) 50%, transparent 100%);
    animation: ripple 4s ease-in-out infinite;
  }

  .water-ripple.tragedy {
     background: radial-gradient(ellipse at center, transparent 0%, rgba(50, 20, 20, 0.6) 50%, transparent 100%);
     animation-duration: 3s; 
  }
  
  @keyframes ripple {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.1); opacity: 0.5; }
  }
  
  .entity-shadow {
    position: absolute;
    top: 50%;
    left: 0;
    width: 22vh; 
    height: 15vh;
    background: radial-gradient(ellipse, rgba(0,0,0,0.9) 0%, transparent 70%);
    z-index: 10;
    transform: translateY(-50%);
  }
  
  .crack-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L100 100 M200 0 L0 300' stroke='rgba(255,255,255,0.1)' stroke-width='2' fill='none'/%3E%3C/svg%3E");
    z-index: 40;
    mix-blend-mode: overlay;
  }

  /* Pause Logic */
  .paused-animation, .paused-animation * {
    animation-play-state: paused !important;
  }
`;

export default function Dashboard({ career, onShiftEnd }) {
  const [state, setState] = useState({
    temperature: 30,
    pressure: 30,
    containment: 30,
    hullIntegrity: career.hullIntegrity || 100,
    survivalTime: 0,
    elapsedTime: 0,
    hazardState: {
      trenchLightning: false,
      heavyCurrent: false,
      deepSeaEntity: false,
      jammedSlider: null
    },
    recentLogs: [],
    showPurgeButton: false,
    driftMultipliers: { temperature: 1.1, pressure: 1.1, containment: 1.1 },
    isPaused: false
  });
  
  const [timeRemaining, setTimeRemaining] = useState(SHIFT_DURATION);
  const [ventValue, setVentValue] = useState([50]);
  const [coolantValue, setCoolantValue] = useState([50]);
  const [magneticsValue, setMagneticsValue] = useState([50]);
  const [resumeFlicker, setResumeFlicker] = useState(false);
  
  const shiftTimerRef = useRef(null);
  const logContainerRef = useRef(null);

  // Reinforced Glass Calculation
  const reinforcedGlassCount = career.upgrades.filter(u => u === 'Reinforced Glass').length;
  const distortionReduction = Math.min(0.8, reinforcedGlassCount * 0.3);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.recentLogs]);

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = REACTOR_CORE_STYLES;
    document.head.appendChild(styleElement);

    startReactorLoop(
      (fullState) => {
        setState(prev => ({ ...fullState }));
        if (fullState.hullIntegrity < 25 && fullState.hullIntegrity > 0 && !fullState.isPaused) {
           if (Math.random() < 0.02) playLowFrequencyAlarm();
        }
      },
      (criticalEvent) => {
        handleShiftEnd(false, criticalEvent?.type || 'MELTDOWN');
      }
    );
    
    shiftTimerRef.current = setInterval(() => {
      // Don't update time if paused
      setState(currentState => {
         if (currentState.isPaused) return currentState;
         
         setTimeRemaining(prev => {
          if (prev <= 1) {
            handleShiftEnd(true, 'SUCCESS');
            return 0;
          }
          return prev - 1;
        });
        return currentState;
      });
    }, 1000);
    
    return () => {
      stopReactorLoop();
      if (shiftTimerRef.current) clearInterval(shiftTimerRef.current);
      document.head.removeChild(styleElement);
    };
  }, []);
  
  const handleShiftEnd = (success, disasterType = null) => {
    stopReactorLoop();
    if (shiftTimerRef.current) clearInterval(shiftTimerRef.current);
    
    const finalState = getReactorState();
    onShiftEnd({
      success,
      disasterType,
      survivalTime: finalState.survivalTime,
      finalState: {
        temperature: finalState.temperature,
        pressure: finalState.pressure,
        containment: finalState.containment,
        hullIntegrity: finalState.hullIntegrity
      }
    });
  };
  
  const handlePause = () => {
    togglePause(true);
  };

  const handleResume = () => {
    togglePause(false);
    setResumeFlicker(true);
    setTimeout(() => setResumeFlicker(false), 500);
  };
  
  const handleVentPressure = (value, isAligned) => {
    setVentValue(value);
    applyControl('VENT_PRESSURE', isAligned);
  };
  
  const handleInjectCoolant = (value, isAligned) => {
    setCoolantValue(value);
    applyControl('INJECT_COOLANT', isAligned);
  };
  
  const handleStabilizeMagnetics = (value, isAligned) => {
    setMagneticsValue(value);
    applyControl('STABILIZE_MAGNETICS', isAligned);
  };
  
  const handleEmergencyPurge = () => {
    triggerEmergencyPurge();
  };
  
  const avgDanger = (state.temperature + state.pressure + state.containment) / 3;
  const isHullCritical = state.hullIntegrity < 25;
  const anyCritical = state.temperature > 85 || state.pressure > 85 || state.containment > 85;
  
  const rawBlur = ((state.temperature - 40) / 60) * 8;
  const blurAmount = Math.max(0, rawBlur * (1 - distortionReduction));
  
  const rawHue = ((state.temperature - 40) / 60) * 30;
  const hueRotate = Math.max(0, rawHue * (1 - distortionReduction));
  
  const getCoreColor = () => {
    if (avgDanger < 60) return 'blue';
    if (avgDanger < 85) return 'orange';
    return 'red';
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shakeIntensity = isHullCritical ? (1 - distortionReduction) : 0;
  const shakeAnimation = isHullCritical && shakeIntensity > 0 && !state.isPaused ? {
    x: [0, -2 * shakeIntensity, 2 * shakeIntensity, 0],
    y: [0, 1 * shakeIntensity, -1 * shakeIntensity, 0],
    transition: { repeat: Infinity, duration: 0.2 }
  } : {};

  return (
    <>
      <Helmet>
        <title>Active Shift - Deep Stoker</title>
        <meta name="description" content="Manage the deep-sea reactor during your shift" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Helmet>

      <CRTStaticOverlay isPaused={state.isPaused} onResume={handleResume} />
      
      {resumeFlicker && <div className="fixed inset-0 z-[100] bg-white pointer-events-none animate-flash"></div>}
      
      <motion.div 
        className={`h-screen max-h-screen w-screen overflow-hidden flex flex-col ${state.hazardState.heavyCurrent ? 'animate-sway' : ''} ${state.isPaused ? 'paused-animation' : ''}`}
        animate={shakeAnimation}
        style={{
          background: 'linear-gradient(135deg, #0a1f1a 0%, #0a5f7f 100%)',
          fontFamily: "'Space Mono', monospace"
        }}
      >
        
        {state.hazardState.trenchLightning && !state.isPaused && (
          <div className="absolute inset-0 z-50 animate-flash pointer-events-none" />
        )}
        
        <CornerCracks 
          elapsedTime={state.elapsedTime} 
          hullIntegrity={state.hullIntegrity} 
          isCritical={anyCritical} 
        />
        
        {isHullCritical && (
           <div className={`crack-overlay opacity-50 ${!state.isPaused ? 'animate-pulse' : ''}`}></div>
        )}

        {/* Background images */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1682919266273-ce10dbeece41" 
            alt=""
            className="w-full h-full object-cover mix-blend-overlay"
          />
        </div>
        
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ filter: isHullCritical ? 'hue-rotate(-50deg) saturate(1.5)' : 'none' }}>
          <div className={`water-ripple ${isHullCritical ? 'tragedy' : ''}`}></div>
        </div>
        
        {state.temperature > 40 && (
          <div 
            className="absolute inset-0 pointer-events-none transition-all duration-500 z-10"
            style={{
              backdropFilter: `blur(${blurAmount}px) hue-rotate(${hueRotate}deg)`,
            }}
          />
        )}
        
        {/* === HEADER SECTION (Fixed, One Line) === */}
        <div className="flex-none h-auto px-2 py-1 bg-black/60 backdrop-blur-md border-b border-emerald-500/30 relative z-20">
          <div className="flex flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
            
            {/* Left: Pause */}
            <PauseButton onPause={handlePause} className="flex-none" />

            {/* Center: Stability Meter */}
            <div className="flex-1 max-w-md mx-2">
              <StructuralStabilityMeter integrity={state.hullIntegrity} />
            </div>

            {/* Right: Timer & Rank */}
            <div className="flex-none text-right flex items-center gap-2">
               <div className="hidden md:block text-[10px] font-bold text-emerald-400 font-orbitron tracking-widest">
                  {career.currentRank}
               </div>
               <div className="text-[14px] font-bold font-orbitron tabular-nums" style={{ color: timeRemaining < 60 ? '#ef4444' : '#10b981' }}>
                  {formatTime(timeRemaining)}
               </div>
            </div>
          </div>
        </div>
        
        {/* === REACTOR ZONE (Flex-1, Centered) === */}
        <div className="flex-1 w-full relative z-20 flex flex-col items-center justify-center p-2">
          
          {/* Logs Overlay (Top-Left Absolute) */}
          <div className="absolute top-2 left-2 max-w-[200px] pointer-events-none opacity-80 hidden sm:block">
            <div ref={logContainerRef} className="max-h-32 overflow-hidden flex flex-col-reverse">
              {state.recentLogs.slice(-3).map((log) => (
                  <div key={log.id} className="text-[9px] text-emerald-400/80 mb-1 font-mono leading-tight">
                    <span className="opacity-50 mr-1">{log.timestamp}</span>
                    {log.message}
                  </div>
              ))}
            </div>
          </div>

          {/* Reactor Container */}
          <div className={`relative transition-transform duration-500 ${state.hazardState.heavyCurrent ? 'animate-sway' : ''}`}>
            
            {state.hazardState.deepSeaEntity && (
              <div className="entity-shadow animate-entity"></div>
            )}
            
            <div className="relative z-20 flex items-center justify-center">
               {/* Emergency Button overlay */}
               <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50">
                   <EmergencyPurgeButton 
                      show={state.showPurgeButton} 
                      onPurge={handleEmergencyPurge} 
                   />
               </div>

              <motion.div
                className={`reactor-core ${getCoreColor()}`}
               animate={!state.isPaused ? {
  scale: avgDanger > 85 ? [1, 1.15, 1] : [1, 1.05, 1], // More violent pulsing at high danger
  filter: [
    `drop-shadow(0 0 20px ${getCoreColor()})`,
    `drop-shadow(0 0 50px ${getCoreColor()})`,
    `drop-shadow(0 0 20px ${getCoreColor()})`
  ]
} : {}}
                transition={{
                  duration: avgDanger > 85 ? 0.5 : avgDanger > 60 ? 1 : 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <div className={`text-4xl font-black mb-1 ${state.hazardState.trenchLightning && !state.isPaused ? 'animate-glitch' : ''}`}>
                    {Math.round(avgDanger)}
                  </div>
                  <div className="text-[10px] opacity-80 mb-2">STATUS</div>
                  
                  {/* Stats inside Orb */}
                  <div className="space-y-0.5 text-left w-full px-6 leading-none">
                    <div className="flex justify-between text-[10px]">
                      <span>T:</span>
                      <span className={state.temperature > 85 ? 'text-red-400' : 'text-emerald-400'}>
                        {Math.round(state.temperature)}°
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>P:</span>
                      <span className={state.pressure > 85 ? 'text-red-400' : 'text-emerald-400'}>
                        {Math.round(state.pressure)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>C:</span>
                      <span className={state.containment > 85 ? 'text-red-400' : 'text-emerald-400'}>
                        {Math.round(state.containment)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* === CONTROL DOCK (Pinned Bottom, Flex-None) === */}
        <div className={`flex-none w-full bg-black/40 border-t border-emerald-500/30 backdrop-blur-md px-2 pb-6 pt-2 z-50 ${state.hazardState.heavyCurrent && !state.isPaused ? 'animate-jitter' : ''}`}>
          <div className="flex justify-around mb-2 px-4">
  <div className="flex flex-col items-center">
    <span className="text-[8px] text-emerald-500 mb-1">OVERDRIVE</span>
    <button 
      onClick={() => /* Add logic to increase drift but boost credits */ {}}
      className="w-8 h-4 bg-emerald-900/50 rounded-full border border-emerald-500/50 flex items-center px-1"
    >
      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
    </button>
  </div>
  <div className="flex flex-col items-center">
    <span className="text-[8px] text-cyan-500 mb-1">GRID LOAD</span>
    <div className="text-[10px] text-cyan-400 font-orbitron">88%</div>
  </div>
</div>
          
           <div className="w-full max-w-md mx-auto space-y-1">
             <ControlSlider 
              label="VENT PRESSURE"
              value={ventValue}
              onChange={handleVentPressure}
              currentValue={state.pressure}
              driftMultiplier={state.driftMultipliers.pressure}
              color="cyan"
              isJammed={state.hazardState.jammedSlider === 0}
              isGlitch={state.hazardState.trenchLightning}
              isPaused={state.isPaused}
              optimalRange={[30, 50]}
            />
            <ControlSlider 
              label="INJECT COOLANT"
              value={coolantValue}
              onChange={handleInjectCoolant}
              currentValue={state.temperature}
              driftMultiplier={state.driftMultipliers.temperature}
              color="blue"
              isJammed={state.hazardState.jammedSlider === 1}
              isGlitch={state.hazardState.trenchLightning}
              isPaused={state.isPaused}
              optimalRange={[40, 60]}
            />
            <ControlSlider 
              label="STABILIZE MAGNETICS"
              value={magneticsValue}
              onChange={handleStabilizeMagnetics}
              currentValue={state.containment}
              driftMultiplier={state.driftMultipliers.containment}
              color="purple"
              isJammed={state.hazardState.jammedSlider === 2}
              isGlitch={state.hazardState.trenchLightning}
              isPaused={state.isPaused}
              optimalRange={[35, 55]}
            />
           </div>
        </div>
      </motion.div>
    </>
  );
}

function ControlSlider({ label, value, onChange, currentValue, driftMultiplier, color, isJammed, isGlitch, optimalRange, isPaused }) {
  const [inSweetSpot, setInSweetSpot] = useState(false);
  const [flashPenalty, setFlashPenalty] = useState(false);
  
  const getColor = () => {
    if (isJammed) return '#ef4444'; // Red for jammed
    switch(color) {
      case 'cyan': return '#06b6d4';
      case 'blue': return '#3b82f6';
      case 'purple': return '#a855f7';
      default: return '#10b981';
    }
  };

  const handleValueChange = (newValue) => {
    if (isJammed || isPaused) return; 
    
    const val = newValue[0];
    const [min, max] = optimalRange;
    const isNowInSpot = val >= min && val <= max;
    
    if (isNowInSpot && !inSweetSpot) {
      playSuccessChime();
    }
    
    if (!isNowInSpot && inSweetSpot) {
      setFlashPenalty(true);
      setTimeout(() => setFlashPenalty(false), 300);
    }

    setInSweetSpot(isNowInSpot);
    onChange(newValue, isNowInSpot);
  };
  
  const driftRatePct = Math.round(driftMultiplier * 100);
  const driftStatusText = driftMultiplier > 1.05 ? "ACCELERATING" : (driftMultiplier > 1.0 ? "STABILIZING" : "NOMINAL");
  const driftColor = driftMultiplier > 1.05 ? "text-orange-400" : (driftMultiplier > 1.0 ? "text-yellow-400" : "text-emerald-400");

  return (
    <div
      className={`bg-black/60 backdrop-blur-md rounded-lg border transition-colors duration-300 px-3 py-1.5 relative z-50 ${isJammed ? 'border-red-600' : 'border-emerald-500/30'}`}
      style={{
        pointerEvents: (isJammed || isPaused) ? 'none' : 'auto',
        opacity: (isJammed || isPaused) ? 0.7 : 1,
        maxWidth: '450px', 
        margin: '0 auto'   
      }}
    >
      <div className="flex justify-between items-start mb-0">
        <div className={`text-xs font-bold text-emerald-400 ${isGlitch && !isPaused ? 'animate-glitch' : ''}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
          {label}
        </div>
        {isJammed ? (
          <span className="text-[10px] font-bold text-red-500 animate-pulse">JAMMED</span>
        ) : (
          <span className={`text-[10px] font-bold ${driftColor} ${!isPaused ? 'animate-pulse' : ''}`}>
             DRIFT: {driftRatePct}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
          <div className={`${inSweetSpot ? "sweet-spot-glow" : ""} ${flashPenalty ? "penalty-flash" : ""} flex-1 pt-1 pb-1`}>
            <Slider
              value={value}
              onValueChange={handleValueChange}
              max={100}
              step={1}
              className="cursor-pointer touch-none" // touch-none for better mobile sliding
              disabled={isJammed || isPaused}
            />
          </div>
          <div className="text-xl font-bold w-12 text-right" style={{ fontFamily: "'Orbitron', sans-serif", color: getColor() }}>
            {Math.round(currentValue)}
          </div>
      </div>
    </div>
  );
}

