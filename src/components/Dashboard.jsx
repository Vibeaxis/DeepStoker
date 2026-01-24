
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
  togglePause,
  logSignificantEvent
} from '@/utils/ReactorLogic';
import { Button } from '@/components/ui/button';
// ---------------------------------------------------------
// 1. DEFINE HOOK OUTSIDE THE COMPONENT (Or in a separate file)
// ---------------------------------------------------------
const useReactorAudio = (avgDanger, isActive, isPaused) => {
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);

  // Setup Effect
  useEffect(() => {
    if (!isActive || isPaused) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // --- AUDIBILITY FIXES ---
    osc.type = 'triangle'; // Triangles cut through mixes better
    filter.type = 'lowpass';
    
    // CHANGED: Raised filter from 200 to 800 so you can actually hear it
    filter.frequency.value = 800; 
    
    // CHANGED: Bumped start volume from 0.05 to 0.1
    gain.gain.value = 0.1; 

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;

    if (ctx.state === 'suspended') ctx.resume();

    return () => {
      if (ctx.state !== 'closed') ctx.close();
      audioCtxRef.current = null;
    };
  }, [isActive, isPaused]);

  // Modulation Effect
  useEffect(() => {
    if (!audioCtxRef.current || !oscRef.current) return;
    const ctx = audioCtxRef.current;
    
    // CHANGED: Base frequency 60 -> 120. 
    // 60Hz is invisible on laptops. 120Hz is a low hum.
    const targetFreq = 120 + (avgDanger * 2); 
    oscRef.current.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);

    const targetVol = 0.1 + (avgDanger > 80 ? 0.1 : 0);
    gainRef.current.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.1);
    
  }, [avgDanger]);
};
const SHIFT_DURATION = 300; // 5 minutes in seconds

const REACTOR_CORE_STYLES = `
  .reactor-core {
    width: 30vh !important; 
  height: 30vh !important;
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
const BinaryStarCore = ({ color, danger }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-4">
    {/* Outer Glow Star */}
    <motion.polygon
      points="50,5 61,35 95,35 67,57 78,91 50,70 22,91 33,57 5,35 39,35"
      fill="none"
      stroke={color}
      strokeWidth="2"
      animate={{ 
        rotate: 360,
        scale: danger > 85 ? [1, 1.2, 1] : [1, 1.05, 1] 
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
    {/* Inner Pulsing Core */}
    <motion.circle 
      cx="50" cy="50" r="15" 
      fill={color} 
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  </svg>
);
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

const [fogLevel, setFogLevel] = useState(0); // 0 to 100

useEffect(() => {
  if (state.isPaused) return;

  const fogInterval = setInterval(() => {
    setFogLevel(prev => Math.min(prev + 1, 100)); // Slowly fogs up
  }, 1500); // Adjust speed: lower is faster fog

  return () => clearInterval(fogInterval);
}, [state.isPaused]);

const handleWipe = () => {
  if (fogLevel > 10) {
    setFogLevel(0);
    // Add a satisfying wipe sound here if you have one
    logSignificantEvent("VIEWPORT CLEARED");
  }
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
{/* Left Side Pod: Navigation & Pressure */}
<div className="absolute top-1/2 -translate-y-1/2 left-4 hidden lg:block z-30 pointer-events-none">
  <div className="bg-zinc-950/90 border-2 border-cyan-500/50 p-3 space-y-3 w-48 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
    <div className="text-[10px] text-cyan-400 font-black border-b border-cyan-500/30 pb-1">NAV_TELEMETRY</div>
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-cyan-500 font-bold">
        <span>ACOUSTIC:</span> <span className="animate-pulse text-cyan-300">ACTIVE</span>
      </div>
      <div className="flex justify-between text-[11px] text-emerald-400 font-bold">
        <span>EXT_PRESS:</span> 40.2 MPa
      </div>
      <div className="flex justify-between text-[11px] text-blue-400 font-bold">
        <span>DEPTH:</span> 4,200M
      </div>
    </div>
  </div>
</div>

{/* Right Side Pod: Life Support & Link */}
<div className="absolute top-1/2 -translate-y-1/2 right-4 hidden lg:block z-30 pointer-events-none text-right">
  <div className="bg-zinc-950/90 border-2 border-orange-500/50 p-3 space-y-3 w-48 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
    <div className="text-[10px] text-orange-400 font-black border-b border-orange-500/30 pb-1">STAT_READOUT</div>
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-emerald-500 font-bold">
        <span>O2_LEVEL:</span> 98%
      </div>
      <div className="flex justify-between text-[11px] text-orange-400 font-bold">
        <span>RADIATION:</span> LOW
      </div>
      <div className="flex justify-between text-[11px] text-purple-400 font-bold">
        <span>LINK:</span> STABLE
      </div>
    </div>
  </div>
</div>
{/* Optimized Fog Overlay */}
<AnimatePresence>
  {fogLevel > 1 && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleWipe}
      className="steam-overlay"
      style={{
  // Only start blurring once fogLevel is above 20
  backdropFilter: `blur(${fogLevel > 20 ? (fogLevel - 20) / 8 : 0}px)`,
  opacity: fogLevel / 100,
  transition: 'backdrop-filter 0.5s ease'
}}
    >
      {fogLevel > 40 && (
        <div className="text-white font-bold text-lg drop-shadow-lg">
          TAP TO WIPE
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>
        {/* === REACTOR ZONE (Flex-1, Centered) === */}
        <div className="flex-1 w-full relative z-20 flex flex-col items-center justify-center p-2">
          
{/* === COMMAND LOG CONSOLE === */}
<div className="absolute top-4 left-4 z-50 w-72 pointer-events-none hidden md:block">
  <div className="bg-black/80 backdrop-blur-xl border-l-4 border-emerald-500 p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
    <div className="text-[10px] text-emerald-500 font-black mb-2 tracking-[0.2em] uppercase border-b border-emerald-500/20 pb-1">
      System Event Log
    </div>
    <div ref={logContainerRef} className="max-h-32 overflow-hidden flex flex-col-reverse gap-1.5">
      {state.recentLogs.slice(-4).map((log) => (
        <div key={log.id} className="text-[11px] text-emerald-400 font-mono leading-tight flex gap-2">
          <span className="text-emerald-700 shrink-0">[{log.timestamp.split(' ')[0]}]</span>
          <span className="font-bold">{log.message}</span>
        </div>
      ))}
    </div>
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
  className={`reactor-core relative flex items-center justify-center ${getCoreColor()}`}
  animate={!state.isPaused ? {
    scale: avgDanger > 85 ? [1, 1.15, 1] : [1, 1.05, 1],
    filter: [
      `drop-shadow(0 0 20px ${getCoreColor() === 'blue' ? '#3b82f6' : getCoreColor() === 'orange' ? '#f59e0b' : '#ef4444'})`,
      `drop-shadow(0 0 50px ${getCoreColor() === 'blue' ? '#3b82f6' : getCoreColor() === 'orange' ? '#f59e0b' : '#ef4444'})`,
      `drop-shadow(0 0 20px ${getCoreColor() === 'blue' ? '#3b82f6' : getCoreColor() === 'orange' ? '#f59e0b' : '#ef4444'})`
    ]
  } : {}}
  transition={{
    duration: avgDanger > 85 ? 0.5 : avgDanger > 60 ? 1 : 2,
    repeat: Infinity,
    ease: "easeInOut"
  }}
>
  {/* LEVEL 2 OVERLAY: This renders the Star BEHIND the text if level 2 is active */}
  {state.reactorType === 'star' && (
    <div className="absolute inset-0 pointer-events-none opacity-60">
      <svg viewBox="0 0 100 100" className="w-full h-full p-2">
        <motion.polygon
          points="50,5 61,35 95,35 67,57 78,91 50,70 22,91 33,57 5,35 39,35"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  )}
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {/* Main Danger Number with Heavy Outline for Pop */}
        <div 
          className={`text-4xl font-black mb-1 ${state.hazardState.trenchLightning && !state.isPaused ? 'animate-glitch' : ''}`}
          style={{ 
            textShadow: '0 0 10px rgba(0,0,0,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' 
          }}
        >
          {Math.round(avgDanger)}
        </div>
        <div className="text-[10px] font-bold opacity-90 mb-2 tracking-widest" style={{ textShadow: '1px 1px 2px #000' }}>STATUS</div>
        
        {/* Stats inside Orb with increased visibility */}
        <div className="space-y-1 text-left w-full px-6 leading-none">
          <div className="flex justify-between text-[11px] font-bold" style={{ textShadow: '1px 1px 2px #000' }}>
            <span className="opacity-70">T:</span>
            <span className={state.temperature > 85 ? 'text-red-400' : 'text-emerald-400'}>
              {Math.round(state.temperature)}°
            </span>
          </div>
          <div className="flex justify-between text-[11px] font-bold" style={{ textShadow: '1px 1px 2px #000' }}>
            <span className="opacity-70">P:</span>
            <span className={state.pressure > 85 ? 'text-red-400' : 'text-emerald-400'}>
              {Math.round(state.pressure)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] font-bold" style={{ textShadow: '1px 1px 2px #000' }}>
            <span className="opacity-70">C:</span>
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
        
    {/* === CONTROL DOCK === */}
<div className={`flex-none w-full bg-black/40 border-t border-emerald-500/30 backdrop-blur-md px-2 pb-6 pt-2 z-50`}>
        <div className="flex flex-col items-center mb-6 z-50">
  <div className="bg-black/60 backdrop-blur-md p-3 border-2 border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
    <div className="flex items-center gap-6">
      <div className="space-y-1">
        <div className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Viewport Clarity</div>
        <div className="w-32 h-2 bg-blue-950 rounded-full border border-blue-500/20 overflow-hidden">
          <motion.div 
            className="h-full bg-blue-400" 
            animate={{ width: `${fogLevel}%` }}
            style={{ boxShadow: '0 0 10px #60a5fa' }}
          />
        </div>
      </div>
      
      <Button
        onClick={handleWipe}
        // Let them wipe at any time, but make it pulse when it's critical
        className={`h-12 px-6 font-black text-xs transition-all ${
          fogLevel > 70 ? 'bg-blue-600 animate-pulse' : 'bg-zinc-800 border border-blue-500/50'
        }`}
      >
        {fogLevel > 70 ? 'EMERGENCY WIPE' : 'CLEAR GLASS'}
      </Button>
    </div>
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

