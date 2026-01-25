
const STORAGE_KEY = 'deep_stoker_career';

// Make sure RANKS is defined somewhere in this file, likely at the top
// If you don't have RANKS exported, paste this array too:
export const RANKS = [
  { name: 'Novice', threshold: 0, tier: 1 },
  { name: 'Technician', threshold: 1000, tier: 2 },
  { name: 'Engineer', threshold: 2500, tier: 2 },
  { name: 'Master', threshold: 5000, tier: 3 },
  { name: 'Overseer', threshold: 10000, tier: 3 },
  { name: 'Abyssal Architect', threshold: 25000, tier: 4 }
];

// === ADD THIS FUNCTION ===
export function calculateRankProgress(totalCredits) {
  // 1. Find the current rank index based on total credits
  let currentRankIndex = 0;
  
  // Iterate backwards to find the highest rank we qualify for
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalCredits >= RANKS[i].threshold) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = RANKS[currentRankIndex];
  const nextRank = RANKS[currentRankIndex + 1];

  // 2. Handle Max Rank (No next rank)
  if (!nextRank) {
    return { 
      next: null, 
      creditsToNext: 0, 
      progress: 100 
    };
  }

  // 3. Calculate Progress Percentage
  const creditsNeededForLevel = nextRank.threshold - currentRank.threshold;
  const creditsEarnedInLevel = totalCredits - currentRank.threshold;
  
  // Clamp between 0 and 100
  const progress = Math.min(100, Math.max(0, (creditsEarnedInLevel / creditsNeededForLevel) * 100));

  return {
    next: nextRank.name,
    creditsToNext: nextRank.threshold - totalCredits,
    progress: progress
  };
}

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
    required: 'Level 2 Clearance' // Logic to enforce order
  },
  'Level 4 Clearance': {
    cost: 3000,
    description: 'Unlocks the Singularity. The ultimate test of endurance. 5x credit base.',
    maxStack: 1,
    required: 'Level 3 Clearance'
  }
};

export function getRankFromCredits(credits) {
  let rankIndex = RANKS.findIndex(r => credits >= r.minCredits && credits < r.maxCredits);
  if (rankIndex === -1) {
    // Check if above max (last rank)
    if (credits >= RANKS[RANKS.length - 1].minCredits) {
      rankIndex = RANKS.length - 1;
    } else {
      rankIndex = 0; // Default to Novice
    }
  }
  return {
    name: RANKS[rankIndex].name,
    tier: rankIndex
  };
}

export function detectPromotion(oldRank, newRank) {
  const oldIdx = RANKS.findIndex(r => r.name === oldRank);
  const newIdx = RANKS.findIndex(r => r.name === newRank);
  return newIdx > oldIdx;
}

export function loadCareer() {
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (saved) {
    const parsed = JSON.parse(saved);
    
    // Migration: Initialize new fields for existing saves
    if (typeof parsed.totalCredits === 'undefined') {
      // Estimate lifetime credits: current spendable + value of upgrades
      let estimatedLifetime = parsed.totalDepthCredits || 0;
      if (parsed.upgrades && Array.isArray(parsed.upgrades)) {
        parsed.upgrades.forEach(u => {
          if (UPGRADES[u]) estimatedLifetime += UPGRADES[u].cost;
        });
      }
      parsed.totalCredits = estimatedLifetime;
    }
    
    if (typeof parsed.rankTier === 'undefined') {
      const rankInfo = getRankFromCredits(parsed.totalCredits);
      parsed.currentRank = rankInfo.name;
      parsed.rankTier = rankInfo.tier;
    }

    if (typeof parsed.hullIntegrity === 'undefined') {
      parsed.hullIntegrity = 100;
    }

    return parsed;
  }
  
  // Default career
  return {
    playerName: 'Reactor Technician',
    totalDepthCredits: 0, // Spendable currency
    totalCredits: 0,      // Lifetime accumulated (Score/XP)
    currentRank: 'Novice',
    rankTier: 0,
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

export function getHullIntegrity(career) {
  return career.hullIntegrity;
}

export function purchaseUpgrade(career, upgradeType) {
  const upgrade = UPGRADES[upgradeType];
  
  if (!upgrade) {
    return { success: false, message: 'Invalid upgrade type' };
  }
  
  // Special handling for Reinforced Glass (stackable)
  if (upgradeType !== 'Reinforced Glass' && career.upgrades.includes(upgradeType)) {
    return { success: false, message: 'Upgrade already purchased' };
  }
  
  if (career.totalDepthCredits < upgrade.cost) {
    return { success: false, message: 'Insufficient Depth Credits' };
  }
  
  // Deduct from spendable, DO NOT deduct from totalCredits (lifetime)
  career.totalDepthCredits -= upgrade.cost;
  career.upgrades.push(upgradeType);
  
  saveCareer(career);
  
  return { success: true, message: `${upgradeType} purchased successfully!` };
}

export function addCredits(career, credits) {
  career.totalDepthCredits += credits;
  career.totalCredits += credits;
  
  const rankInfo = getRankFromCredits(career.totalCredits);
  career.currentRank = rankInfo.name;
  career.rankTier = rankInfo.tier;
  
  saveCareer(career);
}

export function recordShift(career, success, survivalTime, creditsEarned) {
  const oldRank = career.currentRank;
  
  career.totalShifts += 1;
  if (success) {
    career.successfulShifts += 1;
  }
  career.totalSurvivalTime += survivalTime;
  
  // Add earnings
  career.totalDepthCredits += creditsEarned;
  career.totalCredits += creditsEarned;
  
  // Check Rank
  const rankInfo = getRankFromCredits(career.totalCredits);
  const newRank = rankInfo.name;
  const promotionDetected = detectPromotion(oldRank, newRank);
  
  if (promotionDetected) {
    career.lastPromotionRank = oldRank;
  }
  
  career.currentRank = newRank;
  career.rankTier = rankInfo.tier;
  
  saveCareer(career);
  
  return {
    updatedCareer: career,
    creditsEarned,
    promotionDetected,
    oldRank,
    newRank
  };
}

export function getUpgradeStatus(career, upgradeType) {
  const isStackable = upgradeType === 'Reinforced Glass';
  const ownedCount = career.upgrades.filter(u => u === upgradeType).length;
  const owned = isStackable ? false : ownedCount > 0;

  return {
    owned,
    ownedCount: isStackable ? ownedCount : (owned ? 1 : 0),
    canAfford: career.totalDepthCredits >= UPGRADES[upgradeType].cost,
    cost: UPGRADES[upgradeType].cost,
    description: UPGRADES[upgradeType].description,
    isStackable
  };
}

export function getAllUpgrades() {
  return UPGRADES;
}

export function getRankProgress(totalCredits) {
  const rank = RANKS.find(r => totalCredits >= r.minCredits && totalCredits < r.maxCredits) || RANKS[RANKS.length - 1];
  
  if (rank.name === RANKS[RANKS.length - 1].name && totalCredits >= rank.minCredits) {
    return { current: rank.name, progress: 100, next: null, creditsToNext: 0 };
  }
  
  const progress = ((totalCredits - rank.minCredits) / (rank.maxCredits - rank.minCredits)) * 100;
  const nextRankIndex = RANKS.findIndex(r => r.name === rank.name) + 1;
  
  return {
    current: rank.name,
    progress: Math.min(100, Math.max(0, progress)),
    next: RANKS[nextRankIndex]?.name || null,
    creditsToNext: rank.maxCredits - totalCredits
  };
}
