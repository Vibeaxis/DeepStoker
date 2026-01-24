// --- Core Reactor Simulation Engine ---
import { RANKS } from './CareerProfile';

// ==========================================
// 1. GLOBAL STATE (Stable Memory)
// ==========================================

const recentLogs = []; // Const ensures array always exists (fixes 'slice' error)
const MAX_LOGS = 6;

let callbacks = { onUpdate: null, onCritical: null };

// Default state structure
let reactorState = {
  temperature: 30,
  pressure: 30,
  containment: 30,
  hullIntegrity: 100,
  survivalTime: 0,
  elapsedTime: 0,
  isActive: false,
  isPaused: false,
  intervalId: null,
  rank: 'Novice',
  upgrades: [],
  shiftDuration: 300,
  reactorType: 'circle',
  difficultyMult: 1.0,
  timeScale: 1.0 // For "Invert Gravity" mechanic
};

let hazardState = {
  trenchLightning: false,
  heavyCurrent: false,
  deepSeaEntity: false,
  jammedSlider: null
};

let driftMultipliers = { temperature: 1.1, pressure: 1.1, containment: 1.1 };
let controlAlignment = { temperature: false, pressure: false, containment: false };
let criticalTimers = { temperature: 0, pressure: 0, containment: 0 };
let showPurgeButton = false;
let lastStatusLogTime = 0;
const NOMINAL_LOG_INTERVAL = 30000;
let hazardIntervalId = null;
let activeHazardTimers = [];

// ==========================================
// 2. LOGGING SYSTEM
// ==========================================

export function logSignificantEvent(eventName) {
  if (!recentLogs) return;

  const allowedEvents = [
    "SHIFT STARTED", "STATIONARY STEADY", "PRESSURE ANOMALY", "HAZARD DETECTED", 
    "TRENCH LIGHTNING", "HEAVY CURRENT", "DEEP-SEA ENTITY", "SLIDER JAMMED", 
    "SLIDER UNJAMMED", "EMERGENCY PURGE ACTIVATED", "STATUS: NOMINAL", "DRIFT SPIKE",
    "REACTOR STABILIZED: SHIFT COMPLETE", "GRAVITY INVERTED: HYPER-G", "GRAVITY INVERTED: ZERO-G", "GRAVITY NORMALIZED"
  ];

  const isAllowed = allowedEvents.includes(eventName) || 
                    eventName.includes("FAILURE") || 
                    eventName.includes("CRITICAL") ||
                    eventName.includes("IMPLOSION");

  const newLog = {
    id: Date.now() + Math.random(),
    message: eventName,
    timestamp: new Date().toLocaleTimeString()
  };

  recentLogs.unshift(newLog);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }

  triggerUpdate();
}

export function getRecentLogs() {
  return recentLogs;
}

// ==========================================
// 3. INTERNAL HELPERS
// ==========================================

function handleShiftSuccess() {
  if (reactorState.intervalId) {
    clearInterval(reactorState.intervalId);
    reactorState.intervalId = null;
  }
  
  reactorState.isActive = false;

  logSignificantEvent("REACTOR STABILIZED: SHIFT COMPLETE");
  console.log("AUDIO: Success chime triggered");

  if (callbacks && callbacks.onUpdate) {
    callbacks.onUpdate({ 
      ...reactorState,           // Flattened props for Dashboard (prevents rendering crash)
      hazardState,
      recentLogs,
      isComplete: true, 
      success: true,
      // CRITICAL FIX: This matches what App.js expects (data.finalState.pressure)
      finalState: { ...reactorState } 
    });
  }
}

function triggerUpdate() {
  if (callbacks.onUpdate) {
    callbacks.onUpdate({ ...reactorState, hazardState, recentLogs, showPurgeButton, driftMultipliers });
  }
}

// ==========================================
// 4. CORE SIMULATION FUNCTIONS
// ==========================================

export function initializeReactor(rank = 'Novice', upgrades = [], initialHullIntegrity = 100, config = {}) {
  const shiftDuration = config.duration || 300;

  reactorState = {
    ...reactorState,
    temperature: 30,
    pressure: 30,
    containment: 30,
    hullIntegrity: initialHullIntegrity,
    survivalTime: 0,
    elapsedTime: 0,
    shiftDuration: shiftDuration,
    reactorType: config.reactorType || 'circle',
    difficultyMult: config.difficultyMult || 1.0,
    timeScale: 1.0,
    isActive: true,
    isPaused: false,
    intervalId: null,
    rank,
    upgrades
  };
  
  const baseDrift = reactorState.reactorType === 'star' ? 1.4 : 1.1;
  driftMultipliers = { temperature: baseDrift, pressure: baseDrift, containment: baseDrift };
  controlAlignment = { temperature: false, pressure: false, containment: false };

  resetCriticalTimers();
  showPurgeButton = false;
  
  // Clear logs safely
  recentLogs.length = 0; 
  
  lastStatusLogTime = Date.now();
  
  logSignificantEvent(`SHIFT STARTED: ${shiftDuration}s GOAL`);
  initializeHazardSystem();
  
  return { ...reactorState, hazardState, recentLogs, showPurgeButton, driftMultipliers };
}

export function startReactorLoop(onUpdate, onCritical) {
  callbacks.onUpdate = onUpdate;
  callbacks.onCritical = onCritical;
  
  if (reactorState.intervalId) clearInterval(reactorState.intervalId);
  
  reactorState.intervalId = setInterval(() => {
    // Apply Time Dilation (Gravity Mechanic)
    updateReactor(0.5 * reactorState.timeScale); 
  }, 500);
}

export function updateReactor(deltaTime) {
  if (!reactorState.isActive) return reactorState;
  
  if (reactorState.isPaused) {
    return reactorState;
  }
  
  reactorState.survivalTime += deltaTime;
  reactorState.elapsedTime += deltaTime;
  
  updateDriftRates(deltaTime);
  
  const timeMultiplier = 1 + (reactorState.survivalTime / 300);
  
  const rankMultipliers = { 
    'Novice': 1.0, 
    'Technician': 1.2, 
    'Engineer': 1.4, 
    'Master': 1.6,
    'Overseer': 1.8,
    'Abyssal Architect': 2.0 
  };
  const rankMultiplier = rankMultipliers[reactorState.rank] || 1.0;
  
  let baseTempDrift = 0.8 * timeMultiplier * rankMultiplier;
  let basePressDrift = 0.7 * timeMultiplier * rankMultiplier;
  let baseContDrift = 0.6 * timeMultiplier * rankMultiplier;
  
  if (reactorState.upgrades.includes('Super-Coolant')) baseTempDrift *= 0.8;
  if (reactorState.upgrades.includes('Hardened Seals')) basePressDrift *= 0.8;
  if (reactorState.upgrades.includes('Magnetics Stabilizer')) baseContDrift *= 0.8;
  
  const tempDrift = baseTempDrift * driftMultipliers.temperature;
  const pressureDrift = basePressDrift * driftMultipliers.pressure;
  const containmentDrift = baseContDrift * driftMultipliers.containment;

  reactorState.temperature = Math.min(100, reactorState.temperature + tempDrift);
  reactorState.pressure = Math.min(100, reactorState.pressure + pressureDrift);
  reactorState.containment = Math.min(100, reactorState.containment + containmentDrift);
  
  updateCriticalTimers(deltaTime);
  checkNominalStatus(deltaTime);

  if (reactorState.temperature > 75 || reactorState.pressure > 75 || reactorState.containment > 75) {
     if (Math.random() < 0.05) playLowPowerHum(); 
  }

  // --- THE FIX IS HERE ---
  if (reactorState.temperature >= 100 || reactorState.pressure >= 100 || reactorState.containment >= 100) {
    if (callbacks.onCritical) {
      // WE MUST SEND THE DATA ALONG WITH THE ERROR
      callbacks.onCritical({ 
        type: 'MELTDOWN',
        finalState: { ...reactorState }, // <--- THIS LINE SAVES THE CRASH
        survivalTime: reactorState.survivalTime
      });
    }
  }

  if (reactorState.hullIntegrity <= 0) {
    playImplosionSound();
    if (callbacks.onCritical) {
      // WE MUST SEND THE DATA HERE TOO
      callbacks.onCritical({ 
        type: 'IMPLOSION',
        finalState: { ...reactorState }, // <--- THIS LINE SAVES THE CRASH
        survivalTime: reactorState.survivalTime
      });
    }
  }
  
  triggerUpdate();
  
  return reactorState;
}

// ==========================================
// 5. MECHANICS: GRAVITY, HAZARDS, CONTROLS
// ==========================================

export function setGravityMode(mode) {
  if (mode === 'HYPER') {
    reactorState.timeScale = 5.0; 
    logSignificantEvent("GRAVITY INVERTED: HYPER-G");
  } else if (mode === 'ZERO') {
    reactorState.timeScale = 0.2; 
    logSignificantEvent("GRAVITY INVERTED: ZERO-G");
  } else {
    reactorState.timeScale = 1.0; 
    logSignificantEvent("GRAVITY NORMALIZED");
  }
  triggerUpdate();
}

export function setTimeScale(scale) {
    reactorState.timeScale = scale;
    triggerUpdate();
}

export function togglePause(shouldPause) {
  reactorState.isPaused = shouldPause;
  if (shouldPause) playStaticNoise();
  triggerUpdate();
}

export function checkNominalStatus(deltaTime) {
  const isTempNominal = reactorState.temperature >= 40 && reactorState.temperature <= 60;
  const isPressNominal = reactorState.pressure >= 40 && reactorState.pressure <= 60;
  const isContNominal = reactorState.containment >= 40 && reactorState.containment <= 60;

  if (isTempNominal && isPressNominal && isContNominal) {
    if (Date.now() - lastStatusLogTime > NOMINAL_LOG_INTERVAL) {
      logSignificantEvent("STATUS: NOMINAL");
      lastStatusLogTime = Date.now();
      return true;
    }
  }
  return false;
}

export function applyControl(controlType, isAligned = false) {
  if (reactorState.isPaused) return 0;
  const reduction = Math.floor(Math.random() * 11) + 5;
  updateControlAlignment(controlType, isAligned);

  switch(controlType) {
    case 'VENT_PRESSURE': reactorState.pressure = Math.max(0, reactorState.pressure - reduction); break;
    case 'INJECT_COOLANT': reactorState.temperature = Math.max(0, reactorState.temperature - reduction); break;
    case 'STABILIZE_MAGNETICS': reactorState.containment = Math.max(0, reactorState.containment - reduction); break;
  }
  triggerUpdate();
  return reduction;
}

export function getReactorState() {
  return { ...reactorState, hazardState, recentLogs, showPurgeButton, driftMultipliers };
}

export function calculateDepthCredits() {
  const baseCredits = 100;
  const avgDanger = (reactorState.temperature + reactorState.pressure + reactorState.containment) / 3;
  const shiftMult = reactorState.difficultyMult || 1.0;
  
  let dangerMult = 1.0;
  if (avgDanger < 50) dangerMult = 2.0; 
  else if (avgDanger < 70) dangerMult = 1.5; 
  else if (avgDanger < 85) dangerMult = 1.0; 
  else dangerMult = 0.5;
  
  const rankBonuses = { 'Novice': 1.0, 'Technician': 1.1, 'Engineer': 1.2, 'Master': 1.3, 'Overseer': 1.4, 'Abyssal Architect': 1.5 };
  const rankBonus = rankBonuses[reactorState.rank] || 1.0;
  const survivalBonus = Math.floor(reactorState.survivalTime / 5);
  
  const totalCredits = Math.floor((baseCredits * dangerMult * rankBonus * shiftMult) + survivalBonus);
  
  return { baseCredits, dangerMult, rankBonus, shiftMult, survivalBonus, totalCredits };
}

export function stopReactorLoop() {
  if (reactorState.intervalId) {
    clearInterval(reactorState.intervalId);
    reactorState.intervalId = null;
  }
  stopHazardSystem();
  reactorState.isActive = false;
}

// --- HAZARDS ---

export function initializeHazardSystem() {
  hazardState = { trenchLightning: false, heavyCurrent: false, deepSeaEntity: false, jammedSlider: null };
  if (hazardIntervalId) clearInterval(hazardIntervalId);
  scheduleNextHazard();
}

function scheduleNextHazard() {
  if (!reactorState.isActive) return;
  if (reactorState.isPaused) {
    activeHazardTimers.push(setTimeout(scheduleNextHazard, 500));
    return;
  }

  const elapsedTime = reactorState.elapsedTime;
  let delay = 0;
  let hazardType = null;

  if (elapsedTime < 120) {
    if (Math.random() < 0.5) {
      hazardType = 'HEAVY_CURRENT';
      delay = Math.floor(Math.random() * 5000) + 15000;
    } else {
      hazardType = 'TRENCH_LIGHTNING';
      delay = Math.floor(Math.random() * 5000) + 20000;
    }
  } else {
    delay = Math.floor(Math.random() * 10000) + 40000;
    hazardType = 'RANDOM';
  }
  
  activeHazardTimers.push(setTimeout(() => {
    if (reactorState.isPaused) { scheduleNextHazard(); return; }
    if (hazardType === 'RANDOM') triggerRandomHazard();
    else if (hazardType === 'HEAVY_CURRENT') triggerHeavyCurrent();
    else if (hazardType === 'TRENCH_LIGHTNING') triggerTrenchLightning();
    if (reactorState.isActive) scheduleNextHazard();
  }, delay));
}

function triggerRandomHazard() {
  if (!reactorState.isActive || reactorState.isPaused) return;
  const rand = Math.random();
  if (rand < 0.25) triggerTrenchLightning();
  else if (rand < 0.5) triggerHeavyCurrent();
  else if (rand < 0.75) triggerDeepSeaEntity();
  else triggerSliderJam();
}

export function triggerTrenchLightning() {
  hazardState.trenchLightning = true;
  logSignificantEvent("TRENCH LIGHTNING");
  console.log("AUDIO: Hazard sound triggered");
  activeHazardTimers.push(setTimeout(() => { hazardState.trenchLightning = false; triggerUpdate(); }, 2000));
  triggerUpdate();
}

export function triggerHeavyCurrent() {
  hazardState.heavyCurrent = true;
  logSignificantEvent("HEAVY CURRENT");
  console.log("AUDIO: Hazard sound triggered");
  activeHazardTimers.push(setTimeout(() => { hazardState.heavyCurrent = false; triggerUpdate(); }, Math.floor(Math.random() * 4000) + 8000));
  triggerUpdate();
}

export function triggerDeepSeaEntity() {
  hazardState.deepSeaEntity = true;
  logSignificantEvent("DEEP-SEA ENTITY");
  console.log("AUDIO: Hazard sound triggered");
  activeHazardTimers.push(setTimeout(() => { hazardState.deepSeaEntity = false; triggerUpdate(); }, Math.floor(Math.random() * 2000) + 4000));
  triggerUpdate();
}

export function triggerSliderJam() {
  if (hazardState.jammedSlider !== null) return;
  hazardState.jammedSlider = Math.floor(Math.random() * 3);
  logSignificantEvent("SLIDER JAMMED");
  console.log("AUDIO: Metal creak triggered");
  activeHazardTimers.push(setTimeout(() => { 
    hazardState.jammedSlider = null; 
    logSignificantEvent("SLIDER UNJAMMED"); 
    triggerUpdate(); 
  }, 5000));
  triggerUpdate();
}

export function stopHazardSystem() {
  activeHazardTimers.forEach(id => clearTimeout(id));
  activeHazardTimers = [];
  if (hazardIntervalId) clearInterval(hazardIntervalId);
}

export function triggerEmergencyPurge() {
  if (!reactorState.isActive || reactorState.isPaused) return false;
  reactorState.temperature = 20;
  reactorState.pressure = 20;
  reactorState.containment = 20;
  reactorState.hullIntegrity = Math.max(0, reactorState.hullIntegrity - 15);
  logSignificantEvent("EMERGENCY PURGE ACTIVATED");
  console.log("AUDIO: Metal creak triggered");
  resetCriticalTimers();
  showPurgeButton = false;
  triggerUpdate();
  return true;
}

export function shouldShowPurgeButton() { return showPurgeButton; }

export function resetCriticalTimers() {
  criticalTimers = { temperature: 0, pressure: 0, containment: 0 };
}

function updateCriticalTimers(deltaTime) {
  if (reactorState.temperature > 85) criticalTimers.temperature += deltaTime; else criticalTimers.temperature = 0;
  if (reactorState.pressure > 85) criticalTimers.pressure += deltaTime; else criticalTimers.pressure = 0;
  if (reactorState.containment > 85) criticalTimers.containment += deltaTime; else criticalTimers.containment = 0;
  
  if (criticalTimers.temperature > 5 || criticalTimers.pressure > 5 || criticalTimers.containment > 5) showPurgeButton = true;
  else if (criticalTimers.temperature === 0 && criticalTimers.pressure === 0 && criticalTimers.containment === 0 && showPurgeButton) showPurgeButton = false;
}

function updateDriftRates(deltaTime) {
  const decayRate = 0.05;
  if (controlAlignment.temperature && driftMultipliers.temperature > 1.0) driftMultipliers.temperature = Math.max(1.0, driftMultipliers.temperature - (decayRate * deltaTime));
  if (controlAlignment.pressure && driftMultipliers.pressure > 1.0) driftMultipliers.pressure = Math.max(1.0, driftMultipliers.pressure - (decayRate * deltaTime));
  if (controlAlignment.containment && driftMultipliers.containment > 1.0) driftMultipliers.containment = Math.max(1.0, driftMultipliers.containment - (decayRate * deltaTime));
}

export function updateControlAlignment(controlType, isAligned) {
  let metricKey = '';
  switch(controlType) {
    case 'VENT_PRESSURE': metricKey = 'pressure'; break;
    case 'INJECT_COOLANT': metricKey = 'temperature'; break;
    case 'STABILIZE_MAGNETICS': metricKey = 'containment'; break;
  }
  if (!metricKey) return;
  const wasAligned = controlAlignment[metricKey];
  controlAlignment[metricKey] = isAligned;
  if (wasAligned && !isAligned && !reactorState.isPaused) {
    driftMultipliers[metricKey] = 1.1;
    logSignificantEvent("DRIFT SPIKE");
  }
}

// AUDIO HOOKS (Exported for consistency)
export function playHazardSound() { console.log("AUDIO: Hazard sound triggered"); }
export function playLowPowerHum() { console.log("AUDIO: Low power hum triggered"); }
export function playMetalCreak() { console.log("AUDIO: Metal creak triggered"); }
export function playSuccessChime() { console.log("AUDIO: Success chime triggered"); }
export function playImplosionSound() { console.log("AUDIO: IMPLOSION sound triggered"); }
export function playLowFrequencyAlarm() { console.log("AUDIO: Low Frequency Alarm"); }
export function playStaticNoise() { console.log("AUDIO: Static Noise Loop"); }