
const STORAGE_KEY = 'deep_stoker_career';

// 1. UNIFIED RANK DEFINITIONS (Uses 'threshold')
export const RANKS = [
  { name: 'Novice', threshold: 0, tier: 1 },
  { name: 'Technician', threshold: 1000, tier: 2 },
  { name: 'Engineer', threshold: 2500, tier: 2 },
  { name: 'Master', threshold: 5000, tier: 3 },
  { name: 'Overseer', threshold: 10000, tier: 3 },
  { name: 'Abyssal Architect', threshold: 25000, tier: 4 }
];

// 2. UPGRADE DEFINITIONS (Includes Levels 3 & 4)
export const UPGRADES = {
  'Reinforced Glass': {
    cost: 150,
    description: 'Reduces visual distortion during hazards (Stacks)',
    maxStack: 3
  },
  'Hardened Seals': {
    cost: 50,
    description: 'Reduces Pressure drift by 20%',
    maxStack: 1
  },
  'Super-Coolant': {
    cost: 75,
    description: 'Reduces Temperature drift by 20%',
    maxStack: 1
  },
  'Magnetics Stabilizer': {
    cost: 100,
    description: 'Reduces Containment drift by 20%',
    maxStack: 1
  },
  'Level 2 Clearance': {
    cost: 500,
    description: 'Unlocks the Binary Star Reactor. Higher thermal drift but 2x credit base.',
    maxStack: 1
  },
  'Level 3 Clearance': {
    cost: 1200,
    description: 'Unlocks the Prism Core. Extremely unstable geometry. 3x credit base.',
    maxStack: 1,
    required: 'Level 2 Clearance'
  },
  'Level 4 Clearance': {
    cost: 3000,
    description: 'Unlocks the Singularity. The ultimate test of endurance. 5x credit base.',
    maxStack: 1,
    required: 'Level 3 Clearance'
  }
};

// 3. CORE CALCULATIONS

// FIXED: Calculates progress % for the bar
export function calculateRankProgress(totalCredits) {
  let currentRankIndex = 0;
  
  // Find highest rank qualified for
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalCredits >= RANKS[i].threshold) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = RANKS[currentRankIndex];
  const nextRank = RANKS[currentRankIndex + 1];

  if (!nextRank) {
    return { next: null, creditsToNext: 0, progress: 100 };
  }

  const creditsNeeded = nextRank.threshold - currentRank.threshold;
  const creditsEarned = totalCredits - currentRank.threshold;
  const progress = Math.min(100, Math.max(0, (creditsEarned / creditsNeeded) * 100));

  return {
    next: nextRank.name,
    creditsToNext: nextRank.threshold - totalCredits,
    progress: progress
  };
}

// FIXED: Gets current rank object safely using thresholds
export function getRankFromCredits(credits) {
  let rank = RANKS[0]; // Default to Novice
  
  // Find highest rank where we meet the threshold
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (credits >= RANKS[i].threshold) {
      rank = RANKS[i];
      break;
    }
  }
  
  return {
    name: rank.name,
    tier: rank.tier
  };
}

export function detectPromotion(oldRank, newRank) {
  const oldIdx = RANKS.findIndex(r => r.name === oldRank);
  const newIdx = RANKS.findIndex(r => r.name === newRank);
  return newIdx > oldIdx;
}

// 4. STORAGE & MANAGEMENT

export function loadCareer() {
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (saved) {
    const parsed = JSON.parse(saved);
    
    // Migration: Initialize missing fields
    if (typeof parsed.totalCredits === 'undefined') {
      let estimatedLifetime = parsed.totalDepthCredits || 0;
      if (parsed.upgrades && Array.isArray(parsed.upgrades)) {
        parsed.upgrades.forEach(u => {
          if (UPGRADES[u]) estimatedLifetime += UPGRADES[u].cost;
        });
      }
      parsed.totalCredits = estimatedLifetime;
    }
    
    // Validate rank
    const rankInfo = getRankFromCredits(parsed.totalCredits);
    parsed.currentRank = rankInfo.name;
    parsed.rankTier = rankInfo.tier;

    if (typeof parsed.hullIntegrity === 'undefined') {
      parsed.hullIntegrity = 100;
    }

    return parsed;
  }
  
  // Default new career
  return {
    playerName: 'Reactor Technician',
    totalDepthCredits: 0,
    totalCredits: 0,
    currentRank: 'Novice',
    rankTier: 1,
    lastPromotionRank: 'Novice',
    upgrades: [],
    totalShifts: 0,
    successfulShifts: 0,
    totalSurvivalTime: 0,
    hullIntegrity: 100
  };
}

export function saveCareer(career) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(career));
}

export function updateHullIntegrity(career, newValue) {
  career.hullIntegrity = Math.max(0, Math.min(100, newValue));
  saveCareer(career);
}

export function purchaseUpgrade(career, upgradeType) {
  const upgrade = UPGRADES[upgradeType];
  
  if (!upgrade) return { success: false, message: 'Invalid upgrade type' };
  
  // Stackable check
  const isStackable = UPGRADES[upgradeType].maxStack > 1;
  const currentCount = career.upgrades.filter(u => u === upgradeType).length;

  if (!isStackable && career.upgrades.includes(upgradeType)) {
    return { success: false, message: 'Upgrade already purchased' };
  }
  
  if (isStackable && currentCount >= UPGRADES[upgradeType].maxStack) {
      return { success: false, message: 'Max upgrades reached' };
  }
  
  if (career.totalDepthCredits < upgrade.cost) {
    return { success: false, message: 'Insufficient Depth Credits' };
  }
  
  career.totalDepthCredits -= upgrade.cost;
  career.upgrades.push(upgradeType);
  
  saveCareer(career);
  return { success: true, message: `${upgradeType} purchased!` };
}

export function recordShift(career, success, survivalTime, creditsEarned) {
  const oldRank = career.currentRank;
  
  career.totalShifts += 1;
  if (success) career.successfulShifts += 1;
  career.totalSurvivalTime += survivalTime;
  
  career.totalDepthCredits += creditsEarned;
  career.totalCredits += creditsEarned;
  
  const rankInfo = getRankFromCredits(career.totalCredits);
  const newRank = rankInfo.name;
  const promotionDetected = detectPromotion(oldRank, newRank);
  
  if (promotionDetected) {
    career.lastPromotionRank = oldRank;
  }
  
  career.currentRank = newRank;
  career.rankTier = rankInfo.tier;
  
  saveCareer(career);
  
  return { updatedCareer: career, creditsEarned, promotionDetected };
}

export function getUpgradeStatus(career, upgradeType) {
  const upgrade = UPGRADES[upgradeType];
  const isStackable = upgrade.maxStack > 1;
  const ownedCount = career.upgrades.filter(u => u === upgradeType).length;
  const owned = isStackable ? ownedCount >= upgrade.maxStack : ownedCount > 0;

  return {
    owned,
    ownedCount,
    canAfford: career.totalDepthCredits >= upgrade.cost,
    cost: upgrade.cost,
    description: upgrade.description,
    isStackable
  };
}