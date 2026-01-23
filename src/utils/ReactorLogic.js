
// Core reactor simulation engine
import { RANKS } from './CareerProfile';

let reactorState = {
  temperature: 30,
  pressure: 30,
  containment: 30,
  hullIntegrity: 100,
  survivalTime: 0,
  elapsedTime: 0, // Track time from shift start
  isActive: false,
  isPaused: false, // Pause state
  intervalId: null,
  rank: 'Novice',
  upgrades: []
};

// Independent Drift System
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
  jammedSlider: null // 0, 1, or 2, or null
};

// Emergency Purge System State
let criticalTimers = {
  temperature: 0,
  pressure: 0,
  containment: 0
};
let showPurgeButton = false;

// Passive Logging State
let lastStatusLogTime = 0;
const NOMINAL_LOG_INTERVAL = 30000; // 30 seconds

// Logging System
const MAX_LOGS = 6;
let recentLogs = [];

let hazardIntervalId = null;
let activeHazardTimers = [];

let callbacks = {
  onUpdate: null,
  onCritical: null
};
let isOverdrive = false;

export function toggleOverdrive(active) {
  isOverdrive = active;
  if (active) {
    logSignificantEvent("OVERDRIVE: OUTPUT SPIKE");
    playHazardSound(); // Use an existing sound for now
  } else {
    logSignificantEvent("OVERDRIVE: NORMALIZING");
  }
}
// --- Audio Event Hooks (Mock) ---
export function playHazardSound() {
  console.log("AUDIO: Hazard sound triggered");
}

export function playLowPowerHum() {
  console.log("AUDIO: Low power hum triggered");
}

export function playMetalCreak() {
  console.log("AUDIO: Metal creak triggered");
}

export function playSuccessChime() {
  console.log("AUDIO: Success chime triggered");
}

export function playImplosionSound() {
  console.log("AUDIO: IMPLOSION sound triggered");
}

export function playLowFrequencyAlarm() {
  console.log("AUDIO: Low Frequency Alarm (Hull Critical)");
}

export function playStaticNoise() {
  console.log("AUDIO: Static Noise Loop (Paused)");
}

// --- Logging System ---

export function logSignificantEvent(eventName) {
  const allowedEvents = [
    "SHIFT STARTED", 
    "STATIONARY STEADY", 
    "PRESSURE ANOMALY", 
    "HAZARD DETECTED", 
    "TRENCH LIGHTNING", 
    "HEAVY CURRENT", 
    "DEEP-SEA ENTITY", 
    "SLIDER JAMMED", 
    "SLIDER UNJAMMED",
    "EMERGENCY PURGE ACTIVATED",
    "STATUS: NOMINAL",
    "DRIFT SPIKE"
  ];

  // Filter but allow criticals
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
  
  // Trigger update to UI
  triggerUpdate();
}

export function getRecentLogs() {
  return recentLogs;
}

// --- Pause System ---

export function togglePause(shouldPause) {
  reactorState.isPaused = shouldPause;
  if (shouldPause) {
    playStaticNoise();
  } else {
    // Logic to resume normal audio would go here
  }
  triggerUpdate();
}

// --- Hazard System ---

export function initializeHazardSystem() {
  hazardState = {
    trenchLightning: false,
    heavyCurrent: false,
    deepSeaEntity: false,
    jammedSlider: null
  };
  
  if (hazardIntervalId) clearInterval(hazardIntervalId);
  scheduleNextHazard();
}

function scheduleNextHazard() {
  if (!reactorState.isActive) return;

  // If paused, wait and try again
  if (reactorState.isPaused) {
    const timerId = setTimeout(scheduleNextHazard, 500);
    activeHazardTimers.push(timerId);
    return;
  }

  const elapsedTime = reactorState.elapsedTime;
  let delay = 0;
  let hazardType = null;

  // Early Shift Tension (< 120s)
  if (elapsedTime < 120) {
    if (Math.random() < 0.5) {
      hazardType = 'HEAVY_CURRENT';
      delay = Math.floor(Math.random() * 5000) + 15000; // 15-20s
    } else {
      hazardType = 'TRENCH_LIGHTNING';
      delay = Math.floor(Math.random() * 5000) + 20000; // 20-25s
    }
  } else {
    // Normal Phase (> 120s)
    delay = Math.floor(Math.random() * 10000) + 40000;
    hazardType = 'RANDOM';
  }
  
  const timerId = setTimeout(() => {
    // Check pause state again right before triggering
    if (reactorState.isPaused) {
        scheduleNextHazard(); // Re-enter scheduling loop which handles pause waiting
        return;
    }

    if (hazardType === 'RANDOM') {
      triggerRandomHazard();
    } else if (hazardType === 'HEAVY_CURRENT') {
      triggerHeavyCurrent();
    } else if (hazardType === 'TRENCH_LIGHTNING') {
      triggerTrenchLightning();
    }
    
    if (reactorState.isActive) scheduleNextHazard();
  }, delay);
  
  activeHazardTimers.push(timerId);
}

function triggerRandomHazard() {
  if (!reactorState.isActive) return;
  if (reactorState.isPaused) return; // Should be handled by scheduler, but safety check

  const rand = Math.random();
  
  if (rand < 0.25) {
    triggerTrenchLightning();
  } else if (rand < 0.5) {
    triggerHeavyCurrent();
  } else if (rand < 0.75) {
    triggerDeepSeaEntity();
  } else {
    triggerSliderJam();
  }
}

export function triggerTrenchLightning() {
  hazardState.trenchLightning = true;
  logSignificantEvent("TRENCH LIGHTNING");
  playHazardSound();
  
  const timer = setTimeout(() => {
    hazardState.trenchLightning = false;
    triggerUpdate();
  }, 2000); 
  activeHazardTimers.push(timer);
  triggerUpdate();
}

export function triggerHeavyCurrent() {
  hazardState.heavyCurrent = true;
  logSignificantEvent("HEAVY CURRENT");
  playHazardSound();
  
  const duration = Math.floor(Math.random() * 4000) + 8000; 
  const timer = setTimeout(() => {
    hazardState.heavyCurrent = false;
    triggerUpdate();
  }, duration);
  activeHazardTimers.push(timer);
  triggerUpdate();
}

export function triggerDeepSeaEntity() {
  hazardState.deepSeaEntity = true;
  logSignificantEvent("DEEP-SEA ENTITY");
  playHazardSound();
  
  const duration = Math.floor(Math.random() * 2000) + 4000; 
  const timer = setTimeout(() => {
    hazardState.deepSeaEntity = false;
    triggerUpdate();
  }, duration);
  activeHazardTimers.push(timer);
  triggerUpdate();
}

export function triggerSliderJam() {
  if (hazardState.jammedSlider !== null) return;
  
  const sliderIndex = Math.floor(Math.random() * 3); 
  hazardState.jammedSlider = sliderIndex;
  logSignificantEvent("SLIDER JAMMED");
  playMetalCreak();
  
  const timer = setTimeout(() => {
    hazardState.jammedSlider = null;
    logSignificantEvent("SLIDER UNJAMMED");
    triggerUpdate();
  }, 5000); 
  activeHazardTimers.push(timer);
  triggerUpdate();
}

export function stopHazardSystem() {
  activeHazardTimers.forEach(id => clearTimeout(id));
  activeHazardTimers = [];
  if (hazardIntervalId) clearInterval(hazardIntervalId);
}

// --- Emergency Purge System ---

export function triggerEmergencyPurge() {
  if (!reactorState.isActive) return false;
  if (reactorState.isPaused) return false;

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

export function shouldShowPurgeButton() {
  return showPurgeButton;
}

export function resetCriticalTimers() {
  criticalTimers.temperature = 0;
  criticalTimers.pressure = 0;
  criticalTimers.containment = 0;
}

function updateCriticalTimers(deltaTime) {
  let anyCritical = false;

  if (reactorState.temperature > 85) {
    criticalTimers.temperature += deltaTime;
    anyCritical = true;
  } else {
    criticalTimers.temperature = 0;
  }

  if (reactorState.pressure > 85) {
    criticalTimers.pressure += deltaTime;
    anyCritical = true;
  } else {
    criticalTimers.pressure = 0;
  }

  if (reactorState.containment > 85) {
    criticalTimers.containment += deltaTime;
    anyCritical = true;
  } else {
    criticalTimers.containment = 0;
  }

  if (criticalTimers.temperature > 5 || criticalTimers.pressure > 5 || criticalTimers.containment > 5) {
    showPurgeButton = true;
  } else if (!anyCritical && showPurgeButton) {
     showPurgeButton = false; 
  }
}

// --- Drift System ---

function updateDriftRates(deltaTime) {
  const decayRate = 0.05; 
  
  if (controlAlignment.temperature && driftMultipliers.temperature > 1.0) {
    driftMultipliers.temperature = Math.max(1.0, driftMultipliers.temperature - (decayRate * deltaTime));
  }
  if (controlAlignment.pressure && driftMultipliers.pressure > 1.0) {
    driftMultipliers.pressure = Math.max(1.0, driftMultipliers.pressure - (decayRate * deltaTime));
  }
  if (controlAlignment.containment && driftMultipliers.containment > 1.0) {
    driftMultipliers.containment = Math.max(1.0, driftMultipliers.containment - (decayRate * deltaTime));
  }
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
    driftMultipliers[metricKey] = 1.1; // Spike
    logSignificantEvent("DRIFT SPIKE");
  }
}

// --- Main Loop ---

export function initializeReactor(rank = 'Novice', upgrades = [], initialHullIntegrity = 100) {
  reactorState = {
    temperature: 30,
    pressure: 30,
    containment: 30,
    hullIntegrity: initialHullIntegrity,
    survivalTime: 0,
    elapsedTime: 0,
    isActive: true,
    isPaused: false,
    intervalId: null,
    rank,
    upgrades
  };
  
  driftMultipliers = {
    temperature: 1.1,
    pressure: 1.1,
    containment: 1.1
  };
  
  controlAlignment = {
    temperature: false,
    pressure: false,
    containment: false
  };

  resetCriticalTimers();
  showPurgeButton = false;
  recentLogs = []; 
  lastStatusLogTime = Date.now();
  
  logSignificantEvent("SHIFT STARTED");
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

export function stopReactorLoop() {
  if (reactorState.intervalId) {
    clearInterval(reactorState.intervalId);
    reactorState.intervalId = null;
  }
  stopHazardSystem();
  reactorState.isActive = false;
}

function triggerUpdate() {
  if (callbacks.onUpdate) {
    callbacks.onUpdate({ ...reactorState, hazardState, recentLogs, showPurgeButton, driftMultipliers });
  }
}

export function updateReactor(deltaTime) {
  if (!reactorState.isActive) return reactorState;
  
  // Pause Logic: If paused, skip updates but keep interval running
  if (reactorState.isPaused) {
    return reactorState;
  }
  
  reactorState.survivalTime += deltaTime;
  reactorState.elapsedTime += deltaTime;
  
  updateDriftRates(deltaTime);
  
  const timeMultiplier = 1 + (reactorState.survivalTime / 300);
  
  // Dynamic rank multipliers matching the extended rank system
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

export function checkNominalStatus(deltaTime) {
  const isTempNominal = reactorState.temperature >= 40 && reactorState.temperature <= 60;
  const isPressNominal = reactorState.pressure >= 40 && reactorState.pressure <= 60;
  const isContNominal = reactorState.containment >= 40 && reactorState.containment <= 60;
if (now - lastStatusLogTime > NOMINAL_LOG_INTERVAL) {
    const flavorLogs = [
      "STATUS: NOMINAL",
      "UPDATING GRID LOAD...",
      "STATION 4: ALL SYSTEMS STEADY",
      "ATMOSPHERIC SEAL CHECK COMPLETE"
    ];
    const message = flavorLogs[Math.floor(Math.random() * flavorLogs.length)];
    logSignificantEvent(message);
    lastStatusLogTime = now;
    return true;
  }

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
  if (reactorState.isPaused) return 0; // Disable controls while paused

  const reduction = Math.floor(Math.random() * 11) + 5;
  
  updateControlAlignment(controlType, isAligned);

  switch(controlType) {
    case 'VENT_PRESSURE':
      reactorState.pressure = Math.max(0, reactorState.pressure - reduction);
      break;
    case 'INJECT_COOLANT':
      reactorState.temperature = Math.max(0, reactorState.temperature - reduction);
      break;
    case 'STABILIZE_MAGNETICS':
      reactorState.containment = Math.max(0, reactorState.containment - reduction);
      break;
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
  
  let multiplier = 1.0;
  if (avgDanger < 50) multiplier = 2.0; 
  else if (avgDanger < 70) multiplier = 1.5; 
  else if (avgDanger < 85) multiplier = 1.0; 
  else multiplier = 0.5;
  
  const rankBonuses = { 
    'Novice': 1.0, 
    'Technician': 1.1, 
    'Engineer': 1.2, 
    'Master': 1.3,
    'Overseer': 1.4,
    'Abyssal Architect': 1.5
  };
  const rankBonus = rankBonuses[reactorState.rank] || 1.0;
  const survivalBonus = Math.floor(reactorState.survivalTime / 10);
 
  // Inside calculateDepthCredits
let totalCredits = Math.floor((baseCredits * multiplier * rankBonus) + survivalBonus);

// Add this:
if (isOverdrive) {
  totalCredits = Math.round(totalCredits * 1.5); // 50% more credits
}
  return {
    baseCredits,
    multiplier,
    rankBonus,
    survivalBonus,
    totalCredits
  };
}
