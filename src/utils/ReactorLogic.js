// Core reactor simulation engine
import { RANKS } from './CareerProfile';

// ==========================================
// 1. STATE DEFINITIONS (MUST BE AT TOP)
// ==========================================

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
  shiftDuration: 300,   // Default
  difficultyMult: 1.0,  // Default
  reactorType: 'circle' // Default
};

let driftMultipliers = {
  temperature: 1.1,
  pressure: 1.1,
  containment: 1.1
};

let controlAlignment = {
  temperature: false,
  pressure: false,
  containment: false
};

let hazardState = {
  trenchLightning: false,
  heavyCurrent: false,
  deepSeaEntity: false,
  jammedSlider: null
};

let criticalTimers = {
  temperature: 0,
  pressure: 0,
  containment: 0
};
let showPurgeButton = false;

let lastStatusLogTime = 0;
const NOMINAL_LOG_INTERVAL = 30000;

const MAX_LOGS = 6;
let recentLogs = []; // Initialized empty array

let hazardIntervalId = null;
let activeHazardTimers = [];

let callbacks = {
  onUpdate: null,
  onCritical: null
};

// ==========================================
// 2. AUDIO HOOKS
// ==========================================

export function playHazardSound() { console.log("AUDIO: Hazard sound triggered"); }
export function playLowPowerHum() { console.log("AUDIO: Low power hum triggered"); }
export function playMetalCreak() { console.log("AUDIO: Metal creak triggered"); }
export function playSuccessChime() { console.log("AUDIO: Success chime triggered"); }
export function playImplosionSound() { console.log("AUDIO: IMPLOSION sound triggered"); }
export function playLowFrequencyAlarm() { console.log("AUDIO: Low Frequency Alarm"); }
export function playStaticNoise() { console.log("AUDIO: Static Noise Loop"); }

// ==========================================
// 3. LOGGING & HELPERS
// ==========================================

export function logSignificantEvent(eventName) {
  // Fix for 'slice' error: Ensure array exists
  if (!recentLogs) recentLogs = [];

  const allowedEvents = [
    "SHIFT STARTED", "STATIONARY STEADY", "PRESSURE ANOMALY", "HAZARD DETECTED", 
    "TRENCH LIGHTNING", "HEAVY CURRENT", "DEEP-SEA ENTITY", "SLIDER JAMMED", 
    "SLIDER UNJAMMED", "EMERGENCY PURGE ACTIVATED", "STATUS: NOMINAL", "DRIFT SPIKE",
    "REACTOR STABILIZED: SHIFT COMPLETE"
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

  recentLogs = [...recentLogs, newLog].slice(-MAX_LOGS);
  triggerUpdate();
}

export function getRecentLogs() {
  return recentLogs;
}

// MOVED DOWN: Now safe because variables above are defined
function handleShiftSuccess() {
  if (reactorState.intervalId) {
    clearInterval(reactorState.intervalId);
    reactorState.intervalId = null;
  }
  
  reactorState.isActive = false;

  logSignificantEvent("REACTOR STABILIZED: SHIFT COMPLETE");
  playSuccessChime();

  if (callbacks && callbacks.onUpdate) {
    callbacks.onUpdate({ 
      ...reactorState, 
      hazardState: typeof hazardState !== 'undefined' ? hazardState : {}, 
      isComplete: true, 
      success: true 
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
    temperature: 30,
    pressure: 30,
    containment: 30,
    hullIntegrity: initialHullIntegrity,
    survivalTime: 0,
    elapsedTime: 0,
    shiftDuration: shiftDuration,
    reactorType: config.reactorType || 'circle',
    difficultyMult: config.difficultyMult || 1.0,
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
  recentLogs = []; // Reset logs to empty array
  lastStatusLogTime = Date.now();
  
  logSignificantEvent(`SHIFT STARTED: ${shiftDuration}s GOAL`);
  initializeHazardSystem();
  
  return { ...reactorState, hazardState, recentLogs, showPurgeButton, driftMultipliers };
}

export function startReactorLoop(onUpdate, onCritical) {
  callbacks.onUpdate = onUpdate;
  callbacks.onCritical = onCritical;
  
  if (reactorState.intervalId) {
    clearInterval(reactorState.intervalId);
  }
  
  reactorState.intervalId = setInterval(() => {
    updateReactor(0.5); 
  }, 500);
}

export function updateReactor(deltaTime) {
  if (!reactorState.isActive || reactorState.isPaused) return reactorState;

  reactorState.survivalTime += deltaTime;
  reactorState.elapsedTime += deltaTime;

  // WIN CONDITION
  if (reactorState.elapsedTime >= reactorState.shiftDuration) {
    handleShiftSuccess();
    return reactorState;
  }

  updateDriftRates(deltaTime);
  
  const timeMultiplier = 1 + (reactorState.survivalTime / 300);
  const rankMultipliers = { 'Novice': 1.0, 'Technician': 1.2, 'Engineer': 1.4, 'Master': 1.6, 'Overseer': 1.8, 'Abyssal Architect': 2.0 };
  const rankMultiplier = rankMultipliers[reactorState.rank] || 1.0;
  
  let baseTempDrift = 0.8 * timeMultiplier * rankMultiplier;
  let basePressDrift = 0.7 * timeMultiplier * rankMultiplier;
  let baseContDrift = 0.6 * timeMultiplier * rankMultiplier;
  
  if (reactorState.upgrades.includes('Super-Coolant')) baseTempDrift *= 0.8;
  if (reactorState.upgrades.includes('Hardened Seals')) basePressDrift *= 0.8;
  if (reactorState.upgrades.includes('Magnetics Stabilizer')) baseContDrift *= 0.8;
  
  reactorState.temperature = Math.min(100, reactorState.temperature + (baseTempDrift * driftMultipliers.temperature));
  reactorState.pressure = Math.min(100, reactorState.pressure + (basePressDrift * driftMultipliers.pressure));
  reactorState.containment = Math.min(100, reactorState.containment + (baseContDrift * driftMultipliers.containment));
  
  updateCriticalTimers(deltaTime);
  checkNominalStatus(deltaTime);

  if (reactorState.temperature > 75 || reactorState.pressure > 75 || reactorState.containment > 75) {
     if (Math.random() < 0.05) playLowPowerHum(); 
  }

  if (reactorState.temperature >= 100 || reactorState.pressure >= 100 || reactorState.containment >= 100) {
    if (callbacks.onCritical) callbacks.onCritical({ type: 'MELTDOWN' });
  }

  if (reactorState.hullIntegrity <= 0) {
    playImplosionSound();
    if (callbacks.onCritical) callbacks.onCritical({ type: 'IMPLOSION' });
  }
  
  triggerUpdate();
  return reactorState;
}

// ==========================================
// 5. HAZARDS & CONTROLS (UNCHANGED LOGIC)
// ==========================================

export function togglePause(shouldPause) {
  reactorState.isPaused = shouldPause;
  if (shouldPause) {
    playStaticNoise();
  }
  triggerUpdate();
}

export function checkNominalStatus(deltaTime) {
  const isTempNominal = reactorState.temperature >= 40 && reactorState.temperature <= 60;
  const isPressNominal = reactorState.pressure >= 40 && reactorState.pressure <= 60;
  const isContNominal = reactorState.containment >= 40 && reactorState.containment <= 60;

  if (isTempNominal && isPressNominal && isContNominal) {
    const now = Date.now();
    if (now - lastStatusLogTime > NOMINAL_LOG_INTERVAL) {
      logSignificantEvent("STATUS: NOMINAL");
      lastStatusLogTime = now;
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

// --- Hazard System Implementations ---

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
  playHazardSound();
  activeHazardTimers.push(setTimeout(() => { hazardState.trenchLightning = false; triggerUpdate(); }, 2000));
  triggerUpdate();
}

export function triggerHeavyCurrent() {
  hazardState.heavyCurrent = true;
  logSignificantEvent("HEAVY CURRENT");
  playHazardSound();
  activeHazardTimers.push(setTimeout(() => { hazardState.heavyCurrent = false; triggerUpdate(); }, Math.floor(Math.random() * 4000) + 8000));
  triggerUpdate();
}

export function triggerDeepSeaEntity() {
  hazardState.deepSeaEntity = true;
  logSignificantEvent("DEEP-SEA ENTITY");
  playHazardSound();
  activeHazardTimers.push(setTimeout(() => { hazardState.deepSeaEntity = false; triggerUpdate(); }, Math.floor(Math.random() * 2000) + 4000));
  triggerUpdate();
}

export function triggerSliderJam() {
  if (hazardState.jammedSlider !== null) return;
  hazardState.jammedSlider = Math.floor(Math.random() * 3);
  logSignificantEvent("SLIDER JAMMED");
  playMetalCreak();
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

// --- Emergency Purge System ---

export function triggerEmergencyPurge() {
  if (!reactorState.isActive || reactorState.isPaused) return false;
  reactorState.temperature = 20;
  reactorState.pressure = 20;
  reactorState.containment = 20;
  reactorState.hullIntegrity = Math.max(0, reactorState.hullIntegrity - 15);
  logSignificantEvent("EMERGENCY PURGE ACTIVATED");
  playMetalCreak();
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