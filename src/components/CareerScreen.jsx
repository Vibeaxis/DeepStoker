
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [newCallsign, setNewCallsign] = useState('');
  
  const { toast } = useToast();
  const playerProfile = usePlayerProfile();
  const { updateCallsign } = usePlayerProfile();

  // Initialize callsign state
  useEffect(() => {
    if (career?.playerName) setNewCallsign(career.playerName);
    else if (playerProfile?.callsign) setNewCallsign(playerProfile.callsign);
  }, [career, playerProfile]);

  const handlePurchaseUpgrade = (upgradeName) => {
    // Check prerequisites
    const upgrade = UPGRADES[upgradeName];
    if (upgrade.required && !career.upgrades.includes(upgrade.required)) {
         toast({
            title: "Access Denied",
            description: `You must own ${upgrade.required} first.`,
            variant: "destructive"
         });
         return;
    }

    const result = purchaseUpgrade(career, upgradeName);
    if (result.success) {
      saveCareer(result.career);
      onCareerUpdate();
      toast({
        title: "Upgrade Installed",
        description: `${upgradeName} is now active.`,
      });
    } else {
      toast({
        title: "Insufficient Credits",
        description: "Complete more shifts to earn credits.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCallsign = async () => {
    if (!newCallsign.trim()) return;
    const success = await updateCallsign(newCallsign);
    if (success) {
      const updatedCareer = { ...career, playerName: newCallsign };
      saveCareer(updatedCareer);
      onCareerUpdate();
      setIsEditingCallsign(false);
      toast({ title: "Callsign Updated", description: `Identify confirmed: ${newCallsign}` });
    }
  };

  const rankProgress = calculateRankProgress(career.totalCredits);

  return (
    <>
      <AnimatePresence>
        {showLeaderboard && <NetworkLeaderboard onClose={() => setShowLeaderboard(false)} />}
      </AnimatePresence>

      <div className="w-full h-screen overflow-hidden flex flex-col p-4 md:p-6"
        style={{
          background: 'linear-gradient(135deg, #0a1f1a 0%, #0a5f7f 100%)',
          fontFamily: "'Space Mono', monospace",
        }}>
        
        {/* Background Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1682919266273-ce10dbeece41" 
            alt=""
            className="w-full h-full object-cover mix-blend-overlay"
          />
        </div>

        {/* HEADER BAR */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between mb-6 shrink-0">
           <div>
              <h1 className="text-4xl font-black text-emerald-400 leading-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                DEEP STOKER
              </h1>
              <p className="text-emerald-500/60 text-xs tracking-widest">COMMAND INTERFACE</p>
           </div>
           
           <Button 
            variant="outline" 
            onClick={() => setShowLeaderboard(true)}
            className="mt-4 md:mt-0 bg-black/40 border-teal-500 text-teal-400 hover:bg-teal-900/20"
           >
             <Globe className="w-4 h-4 mr-2" />
             NETWORK RANKINGS
           </Button>
        </div>

        {/* MAIN GRID LAYOUT */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* LEFT COLUMN: Profile & Action (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* PROFILE CARD */}
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-emerald-500/30 p-6">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <div className="text-xs text-emerald-500 mb-1">TECHNICIAN ID</div>
                     {isEditingCallsign ? (
                      <div className="flex gap-2">
                        <Input 
                          value={newCallsign} onChange={(e) => setNewCallsign(e.target.value.substring(0, 20))}
                          className="bg-emerald-950/50 border-emerald-500/50 text-white font-bold h-8 w-48" autoFocus
                        />
                        <Button size="sm" onClick={handleUpdateCallsign} className="bg-emerald-600 h-8"><Check className="w-4 h-4" /></Button>
                      </div>
                     ) : (
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingCallsign(true)}>
                        <h2 className="text-2xl font-black text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                           {career.playerName || "Unknown"}
                        </h2>
                        <Edit2 className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                     )}
                  </div>
                  
                  <div className="text-right">
                     <div className="text-xs text-emerald-500">CURRENT RANK</div>
                     <div className="text-2xl font-black text-emerald-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        {career.currentRank}
                     </div>
                  </div>
               </div>
               
               {/* Progress Bar */}
               <div className="mb-4">
                  <div className="flex justify-between text-xs text-emerald-400 mb-1">
                     <span>CREDITS: {career.totalCredits.toLocaleString()}</span>
                     <span>{rankProgress.next ? `NEXT: ${rankProgress.creditsToNext.toLocaleString()}` : 'MAX RANK'}</span>
                  </div>
                  <div className="w-full bg-emerald-950/50 h-2 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }} animate={{ width: `${rankProgress.progress}%` }}
                       className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                     />
                  </div>
               </div>

               {/* Stats Row */}
               <div className="grid grid-cols-4 gap-2">
                  <StatBox label="Credits" value={career.totalDepthCredits} icon={TrendingUp} />
                  <StatBox label="Shifts" value={career.totalShifts} icon={Clock} />
                  <StatBox label="Wins" value={career.successfulShifts} icon={CheckCircle} />
                  <StatBox label="Win Rate" value={`${career.totalShifts > 0 ? Math.round((career.successfulShifts/career.totalShifts)*100) : 0}%`} icon={Award} />
               </div>
            </div>

            {/* SHIFT CONTROL (THE HERO SECTION) */}
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-emerald-400 font-bold mb-4 tracking-widest text-sm">INITIATE SHIFT</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full max-h-64">
                <ShiftButton 
                  id="quick" label="QUICK SWEEP" time="3m" mult="1.0x" 
                  color="from-emerald-600 to-teal-800" 
                  onClick={onStartShift} 
                />
                <ShiftButton 
                  id="standard" label="STANDARD WATCH" time="5m" mult="1.5x" 
                  color="from-teal-600 to-cyan-800" 
                  onClick={onStartShift} 
                />
                <ShiftButton 
                  id="deep" label="DEEP DIVE" time="10m" mult="3.0x" 
                  color="from-cyan-600 to-blue-800" 
                  onClick={onStartShift} 
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Upgrade Shop (5 cols) */}
          <div className="lg:col-span-5 bg-black/40 backdrop-blur-md rounded-xl border border-emerald-500/30 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-emerald-500/30 bg-emerald-950/30">
                <h2 className="text-lg font-black text-emerald-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                   SUPPLY DEPOT
                </h2>
                <p className="text-xs text-emerald-500/60">Balance: {career.totalDepthCredits} DC</p>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {Object.entries(UPGRADES).map(([name, upgrade]) => {
                   const status = getUpgradeStatus(career, name);
                   const isLocked = upgrade.required && !career.upgrades.includes(upgrade.required);
                   
                   return (
                      <div key={name} className={`relative p-4 rounded-lg border transition-all ${
                         status.owned ? 'bg-emerald-900/20 border-emerald-500/50' : 
                         isLocked ? 'bg-black/40 border-gray-800 opacity-60' :
                         'bg-black/40 border-emerald-500/30 hover:bg-emerald-900/10'
                      }`}>
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <h4 className={`font-bold ${status.owned ? 'text-emerald-400' : 'text-white'}`}>{name}</h4>
                               <p className="text-xs text-gray-400 leading-tight mt-1">{upgrade.description}</p>
                               {isLocked && <p className="text-xs text-red-400 mt-1 font-bold">REQ: {upgrade.required}</p>}
                            </div>
                            {status.owned && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                         </div>
                         
                         <div className="flex justify-between items-center mt-3">
                            <span className="text-emerald-400 font-mono font-bold">{upgrade.cost} DC</span>
                            <Button 
                               size="sm"
                               disabled={status.owned || !status.canAfford || isLocked}
                               onClick={() => handlePurchaseUpgrade(name)}
                               className={`h-8 text-xs ${status.owned ? 'bg-transparent border border-emerald-500 text-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                            >
                               {status.owned ? 'OWNED' : isLocked ? <Lock className="w-3 h-3" /> : 'BUY'}
                            </Button>
                         </div>
                      </div>
                   )
                })}
             </div>
          </div>

        </div>
      </div>
    </>
  );
}

// Sub-components to clean up code
function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="bg-emerald-950/30 rounded p-2 border border-emerald-500/20 text-center">
       <Icon className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
       <div className="text-lg font-bold text-white leading-none">{value}</div>
       <div className="text-[10px] text-emerald-500/60 uppercase">{label}</div>
    </div>
  )
}

function ShiftButton({ id, label, time, mult, color, onClick }) {
  return (
    <Button
      onClick={() => onClick(id)}
      className={`h-full flex flex-col justify-center items-center bg-gradient-to-br ${color} border-2 border-white/5 hover:border-white/30 hover:scale-[1.02] transition-all shadow-lg`}
    >
      <span className="text-xl font-black mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>{label}</span>
      <div className="flex gap-2 text-xs font-mono opacity-80 bg-black/20 px-2 py-1 rounded">
         <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {time}</span>
         <span className="border-l border-white/20 pl-2">{mult} PAY</span>
      </div>
    </Button>
  )
}