
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllUpgrades, getUpgradeStatus, purchaseUpgrade, getRankProgress, saveCareer } from '@/utils/CareerProfile';
import { useToast } from '@/components/ui/use-toast';
import { Award, TrendingUp, Clock, CheckCircle, Lock, ShoppingCart, Globe, Edit2, Check, Star } from 'lucide-react';
import NetworkLeaderboard from './NetworkLeaderboard';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

export default function CareerScreen({ career, onStartShift, onCareerUpdate }) {
  const { toast } = useToast();
  const upgrades = getAllUpgrades();
  const rankProgress = getRankProgress(career.totalCredits); // Use totalCredits (lifetime)
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [newCallsign, setNewCallsign] = useState('');
  
  const playerProfile = usePlayerProfile();
  const { updateCallsign } = useLeaderboard();
// Add this inside the component to ensure we never render a "dead" screen
useEffect(() => {
  if (career && career.hullIntegrity <= 0) {
    career.hullIntegrity = 100;
    onCareerUpdate(); // Force a save/refresh of the fixed health
  }
}, [career]);
  // Sync profile callsign to local state for editing
  useEffect(() => {
    if (!playerProfile.loading) {
      setNewCallsign(playerProfile.callsign);
    }
  }, [playerProfile]);

  const handlePurchaseUpgrade = (upgradeType) => {
    const result = purchaseUpgrade(career, upgradeType);
    
    if (result.success) {
      toast({
        title: "Upgrade Purchased!",
        description: result.message,
      });
      onCareerUpdate();
    } else {
      toast({
        title: "Purchase Failed",
        description: result.message,
        variant: "destructive"
      });
    }
  };
const handleStartShift = () => {
  const currentCareer = loadCareer();
  // FORCE 100 as the third argument so every shift starts fresh
  initializeReactor(currentCareer.currentRank, currentCareer.upgrades, 100); 
  setCurrentScreen('shift');
};
  const handleUpdateCallsign = async () => {
    if (!newCallsign.trim()) return;
    
    // Optimistic update locally
    career.playerName = newCallsign;
    saveCareer(career);
    onCareerUpdate();

    // Network update
    if (playerProfile.device_id) {
       const success = await updateCallsign(playerProfile.device_id, newCallsign);
       if (success) {
          toast({
            title: "Callsign Updated",
            description: `Network ID changed to: ${newCallsign}`,
          });
       }
    }
    
    setIsEditingCallsign(false);
  };
  
  return (
    <>
      <Helmet>
        <title>Career Profile - Deep Stoker</title>
        <meta name="description" content="Manage your deep-sea reactor technician career" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Helmet>

      <AnimatePresence>
        {showLeaderboard && <NetworkLeaderboard onClose={() => setShowLeaderboard(false)} />}
      </AnimatePresence>
  
<div className="w-full overflow-y-auto px-4 py-8 md:px-8"
  style={{
    background: 'linear-gradient(135deg, #0a1f1a 0%, #0a5f7f 100%)',
    fontFamily: "'Space Mono', monospace",
    minHeight: '100vh' // Ensures background covers everything
  }}>
        
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1682919266273-ce10dbeece41" 
            alt=""
            className="w-full h-full object-cover mix-blend-overlay"
          />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 relative"
          >
            <div className="absolute top-0 right-0">
               <Button 
                variant="outline" 
                onClick={() => setShowLeaderboard(true)}
                className="bg-black/40 border-teal-500 text-teal-400 hover:bg-teal-900/20"
               >
                 <Globe className="w-4 h-4 mr-2" />
                 NETWORK RANKINGS
               </Button>
            </div>

            <h1 className="text-5xl font-black text-emerald-400 mb-2" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 20px rgba(16, 185, 129, 0.5)' }}>
              DEEP STOKER
            </h1>
            <p className="text-emerald-300 text-lg">Deep-Sea Reactor Management System</p>
          </motion.div>
          
          {/* Career Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/60 backdrop-blur-md rounded-2xl border-2 border-emerald-500/50 p-8 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-full max-w-md">
                <div className="text-sm text-emerald-300 mb-1">TECHNICIAN ID</div>
                
                {isEditingCallsign ? (
                  <div className="flex gap-2">
                    <Input 
                      value={newCallsign} 
                      onChange={(e) => setNewCallsign(e.target.value.substring(0, 20))}
                      className="bg-emerald-950/50 border-emerald-500/50 text-white font-bold h-10 text-xl"
                      autoFocus
                    />
                    <Button onClick={handleUpdateCallsign} className="bg-emerald-600 hover:bg-emerald-500">
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <div className="text-3xl font-black text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {career.playerName || playerProfile.callsign}
                    </div>
                    <button 
                      onClick={() => setIsEditingCallsign(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 hover:text-emerald-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-emerald-300 mb-1">CURRENT RANK</div>
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2">
                     <Award className="w-8 h-8 text-emerald-400" />
                     <div className="text-3xl font-black text-emerald-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                       {career.currentRank}
                     </div>
                   </div>
                   <div className="text-xs text-emerald-500 font-bold uppercase tracking-widest mt-1">
                      Tier {career.rankTier} Class
                   </div>
                </div>
              </div>
            </div>
            
            {/* Rank Progress */}
            <div className="mb-6 bg-black/40 p-4 rounded-lg border border-emerald-900/50">
                <div className="flex justify-between text-sm text-emerald-300 mb-2">
                  <span className="flex items-center gap-2">
                     <Star className="w-4 h-4 text-yellow-500" />
                     CAREER PROGRESS: <span className="text-white font-bold">{career.totalCredits.toLocaleString()} Total Credits</span>
                  </span>
                  {rankProgress.next ? (
                    <span>{rankProgress.creditsToNext.toLocaleString()} to {rankProgress.next}</span>
                  ) : (
                    <span className="text-yellow-400 font-bold">MAXIMUM RANK ACHIEVED</span>
                  )}
                </div>
                <div className="w-full bg-emerald-950/50 rounded-full h-4 border border-emerald-500/30 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rankProgress.progress}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 relative"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[slide-right_1s_linear_infinite] opacity-30"></div>
                  </motion.div>
                </div>
            </div>
            
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="bg-emerald-950/50 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <div className="text-xs text-emerald-300">SPENDABLE CREDITS</div>
                </div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {career.totalDepthCredits}
                </div>
              </div>
              
              <div className="bg-emerald-950/50 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <div className="text-xs text-emerald-300">TOTAL SHIFTS</div>
                </div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {career.totalShifts}
                </div>
              </div>
              
              <div className="bg-emerald-950/50 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div className="text-xs text-emerald-300">SUCCESSFUL</div>
                </div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {career.successfulShifts}
                </div>
              </div>
              
              <div className="bg-emerald-950/50 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  <div className="text-xs text-emerald-300">SUCCESS RATE</div>
                </div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {career.totalShifts > 0 ? Math.round((career.successfulShifts / career.totalShifts) * 100) : 0}%
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Upgrades Shop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/60 backdrop-blur-md rounded-2xl border-2 border-emerald-500/50 p-8 mb-6"
          >
            <h2 className="text-2xl font-black text-emerald-400 mb-6" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              EQUIPMENT UPGRADES
            </h2>
            
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(upgrades).map(([name, upgrade], index) => {
                const status = getUpgradeStatus(career, name);
                
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`rounded-lg p-6 border-2 ${
                      status.owned 
                        ? 'bg-emerald-900/30 border-emerald-500' 
                        : 'bg-black/40 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        {name}
                      </h3>
                      {status.owned && (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      )}
                    </div>
                    
                    <p className="text-sm text-emerald-300 mb-4 min-h-[40px]">
                      {upgrade.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        {upgrade.cost} DC
                      </div>
                      
                      <Button
                        onClick={() => handlePurchaseUpgrade(name)}
                        disabled={status.owned || !status.canAfford}
                        className={`${
                          status.owned
                            ? 'bg-emerald-700'
                            : status.canAfford
                            ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500'
                            : 'bg-gray-700'
                        }`}
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                      >
                        {status.owned ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            OWNED
                          </>
                        ) : status.canAfford ? (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            BUY
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            LOCKED
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
          
         {/* Shift Type Selection */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.5 }}
  className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
>
  {[
    { id: 'quick', label: 'QUICK SWEEP', time: '3m', mult: '1.0x', color: 'from-emerald-600 to-teal-700' },
    { id: 'standard', label: 'STANDARD WATCH', time: '5m', mult: '1.5x', color: 'from-teal-600 to-cyan-700' },
    { id: 'deep', label: 'DEEP DIVE', time: '10m', mult: '3.0x', color: 'from-cyan-600 to-blue-700' },
  ].map((shift) => (
    <Button
      key={shift.id}
      onClick={() => onStartShift(shift.id)}
      className={`h-24 flex flex-col bg-gradient-to-br ${shift.color} border-2 border-white/10 hover:border-white/40 transition-all`}
      style={{ fontFamily: "'Orbitron', sans-serif" }}
    >
      <span className="text-lg font-black">{shift.label}</span>
      <span className="text-xs opacity-80">{shift.time} DURATION // {shift.mult} PAYOUT</span>
    </Button>
  ))}
</motion.div>
        </div>
      </div>
    </>
  );
}
