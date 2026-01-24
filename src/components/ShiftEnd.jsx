import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { addCredits, loadCareer, saveCareer } from '@/utils/CareerProfile'; 
import { CheckCircle, XCircle, Award, Clock, Flame, Droplet, Zap, ShieldAlert, UploadCloud } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import DataSyncBar from './DataSyncBar';
import PromotionModal from './PromotionModal';
import { useToast } from '@/components/ui/use-toast';

export default function ShiftEnd({ shiftData, onReturnToCareer, onCareerUpdate }) {
  // 1. SAFETY FIRST: Handle missing or malformed data
  // If shiftData is missing, default to empty object
  const safeData = shiftData || {};
  
  // If finalState is missing, try to use safeData itself, or empty object
  const finalState = safeData.finalState || safeData || {};

  // 2. SAFE EXTRACTION: Use '?. property' and '?? default'
  // This prevents "Cannot read properties of undefined" completely
  const temperature = finalState?.temperature ?? 0;
  const pressure = finalState?.pressure ?? 0;
  const containment = finalState?.containment ?? 0;
  const hullIntegrity = finalState?.hullIntegrity ?? 0;
  
  const success = safeData?.success ?? false;
  const survivalTime = safeData?.survivalTime ?? 0;
  const disasterType = safeData?.disasterType || null;
  const creditsEarned = safeData?.creditsEarned ?? 0;
  const difficultyMult = finalState?.difficultyMult ?? 1.0;

  // Now math is safe because we guaranteed numbers above
  const avgDanger = (temperature + pressure + containment) / 3;
  const isImplosion = disasterType === 'IMPLOSION';

  const [syncStatus, setSyncStatus] = useState('idle'); 
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionDetails, setPromotionDetails] = useState(null);
  
  const { syncPlayerData } = useLeaderboard();
  const playerProfile = usePlayerProfile();
  const { toast } = useToast();

  useEffect(() => {
    const career = loadCareer();
    if (career.lastPromotionRank && career.lastPromotionRank !== career.currentRank) {
       setPromotionDetails({
           oldRank: career.lastPromotionRank,
           newRank: career.currentRank
       });
       setShowPromotion(true);
    }
  }, []);

  const handleSyncData = async (updatedCareer = null) => {
    if (syncStatus === 'syncing' || syncStatus === 'success') return;
    
    setSyncStatus('syncing');
    setSyncProgress(0);

    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    const career = updatedCareer || loadCareer();
    
    const dataToSync = {
      callsign: playerProfile.callsign,
      survival_time: Math.max(playerProfile.survival_time, survivalTime),
      total_credits: career.totalCredits, 
      current_rank: career.currentRank
    };

    try {
      const success = await syncPlayerData(playerProfile.device_id, dataToSync);
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      if (success) {
        setSyncStatus('success');
        toast({
            title: "Data Synced",
            description: "Your shift record has been uploaded to the network.",
        });
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      clearInterval(progressInterval);
      setSyncStatus('error');
    }
  };

  const handleAcceptPromotion = () => {
    const career = loadCareer();
    addCredits(career, 1000); 
    
    career.lastPromotionRank = career.currentRank; 
    saveCareer(career); 
    
    toast({
      title: "Bonus Received",
      description: "1,000 Depth Credits added to your account.",
    });
    
    setShowPromotion(false);
    handleSyncData(career); 
    
    if (onCareerUpdate) onCareerUpdate();
  };

  return (
    <>
      <Helmet>
        <title>Shift Complete - Deep Stoker</title>
        <meta name="description" content="Your shift has ended" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Helmet>

      <PromotionModal 
        show={showPromotion} 
        newRank={promotionDetails?.newRank} 
        onAccept={handleAcceptPromotion} 
      />
      
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          background: isImplosion 
            ? 'black' 
            : 'linear-gradient(135deg, #0a1f1a 0%, #0a5f7f 100%)',
          fontFamily: "'Space Mono', monospace"
        }}>
        
        {isImplosion && (
          <div className="absolute inset-0 bg-black z-0">
             <div className="absolute inset-0 animate-pulse bg-red-900/20"></div>
          </div>
        )}

        {!isImplosion && (
          <div className="absolute inset-0 opacity-20">
            <img 
              src="https://images.unsplash.com/photo-1567665184315-5581ad476373" 
              alt=""
              className="w-full h-full object-cover mix-blend-overlay"
            />
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={`relative z-10 backdrop-blur-md rounded-2xl border-2 p-8 max-w-2xl w-full ${isImplosion ? 'bg-black border-red-800' : 'bg-black/60 border-emerald-500/50'}`}
          style={{ borderColor: success ? '#10b981' : isImplosion ? '#7f1d1d' : '#ef4444' }}
        >
          <div className="text-center mb-8">
            {success ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle className="w-24 h-24 mx-auto mb-4 text-emerald-400" />
                <h1 className="text-4xl font-black text-emerald-400 mb-2" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 20px rgba(16, 185, 129, 0.5)' }}>
                  SHIFT COMPLETE
                </h1>
                <p className="text-emerald-300 text-lg">Reactor stabilized successfully</p>
                
                {difficultyMult > 1.0 && (
                   <div className="mt-2 text-xs font-bold text-orange-400 border border-orange-500/30 inline-block px-2 py-1 rounded bg-orange-950/30 uppercase tracking-widest">
                      Difficulty Bonus: {difficultyMult}x
                   </div>
                )}
              </motion.div>
            ) : isImplosion ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <ShieldAlert className="w-24 h-24 mx-auto mb-4 text-red-600 animate-pulse" />
                <h1 className="text-4xl font-black text-red-600 mb-2" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 30px rgba(220, 38, 38, 0.8)' }}>
                  IMPLOSION
                </h1>
                <p className="text-red-400 text-lg font-bold">STRUCTURAL FAILURE - TOTAL LOSS</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <XCircle className="w-24 h-24 mx-auto mb-4 text-red-400" />
                <h1 className="text-4xl font-black text-red-400 mb-2" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>
                  CRITICAL FAILURE
                </h1>
                <p className="text-red-300 text-lg">Reactor containment breach</p>
              </motion.div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-emerald-950/50 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div className="text-sm text-emerald-300">Survival Time</div>
              </div>
              <div className="text-3xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {Math.round(survivalTime)}s
              </div>
            </div>
            
            <div className="bg-emerald-950/50 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <div className="text-sm text-emerald-300">Avg Danger</div>
              </div>
              <div className="text-3xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {Math.round(avgDanger)}%
              </div>
            </div>
          </div>
          
          <div className="bg-black/40 rounded-lg p-4 mb-8 border border-emerald-500/30">
            <div className="text-sm text-emerald-300 mb-4 font-bold">FINAL REACTOR STATE</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-white">Temperature</span>
                </div>
                <div className="text-xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {Math.round(temperature)}°
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-cyan-400" />
                  <span className="text-white">Pressure</span>
                </div>
                <div className="text-xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {Math.round(pressure)} PSI
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="text-white">Containment</span>
                </div>
                <div className="text-xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {Math.round(containment)}%
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-500/20 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-5 h-5 ${hullIntegrity < 25 ? 'text-red-500' : 'text-emerald-400'}`} />
                  <span className="text-white">Hull Integrity</span>
                </div>
                <div className={`text-xl font-bold ${hullIntegrity < 25 ? 'text-red-500' : 'text-emerald-400'}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {Math.round(hullIntegrity)}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-900/50 to-cyan-900/50 rounded-lg p-6 mb-8 border border-emerald-400/50">
            <div className="text-center">
              <div className="text-sm text-emerald-300 mb-2">DEPTH CREDITS EARNED</div>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <div className="text-sm text-emerald-300">Total</div>
                  <div className="text-4xl font-black text-emerald-400" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 20px rgba(16, 185, 129, 0.5)' }}>
                    {creditsEarned}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DataSyncBar 
            status={syncStatus} 
            progress={syncProgress} 
            onRetry={() => handleSyncData()} 
          />
          
          <div className="space-y-3">
             {syncStatus === 'idle' && (
                <Button
                  onClick={() => handleSyncData()}
                  className="w-full h-12 text-lg font-bold border border-teal-500 bg-teal-900/20 hover:bg-teal-800/40 text-teal-400"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  <UploadCloud className="w-5 h-5 mr-2" />
                  SYNC DATA TO NETWORK
                </Button>
             )}

             <Button
               onClick={onReturnToCareer}
               disabled={syncStatus === 'syncing'}
               className="w-full h-14 text-lg font-bold"
               style={{ 
                 fontFamily: "'Orbitron', sans-serif",
                 background: 'linear-gradient(90deg, #10b981 0%, #0d9488 100%)',
                 boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
               }}
             >
               RETURN TO CAREER
             </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}