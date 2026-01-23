
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Trophy, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

export default function NetworkLeaderboard({ onClose }) {
  const { fetchTopPlayers, loading, error } = useLeaderboard();
  const playerProfile = usePlayerProfile();
  const [topPlayers, setTopPlayers] = useState([]);

  const loadData = async () => {
    const data = await fetchTopPlayers();
    setTopPlayers(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-black border-2 border-teal-500/50 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(20,184,166,0.2)] font-mono"
      >
        {/* Header */}
        <div className="bg-teal-950/50 border-b border-teal-500/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-400">
            <Globe className="w-5 h-5" />
            <h2 className="font-bold tracking-widest text-lg" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              [NETWORK] TOP 10
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-teal-400 hover:text-teal-200 hover:bg-teal-900/20">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 relative min-h-[300px]">
          {/* Scanline Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-teal-500/50 gap-4">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <div className="text-xs animate-pulse">ESTABLISHING UPLINK...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-2">
              <div className="text-sm">{error}</div>
              <Button onClick={loadData} variant="outline" className="border-red-500/50 hover:bg-red-900/20">
                RETRY CONNECTION
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
               <div className="grid grid-cols-12 text-xs text-teal-500/50 mb-2 px-2 uppercase tracking-wider">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-6">Callsign</div>
                  <div className="col-span-4 text-right">Survival Time</div>
               </div>

               {topPlayers.map((player, index) => (
                 <motion.div 
                   key={index}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: index * 0.05 }}
                   className={`grid grid-cols-12 items-center p-2 rounded bg-teal-900/10 border border-teal-500/10 ${player.callsign === playerProfile.callsign ? 'border-teal-400 bg-teal-900/30' : ''}`}
                 >
                   <div className="col-span-2 font-bold text-teal-400">#{index + 1}</div>
                   <div className="col-span-6 text-teal-100 truncate pr-2">{player.callsign}</div>
                   <div className="col-span-4 text-right text-teal-300 font-mono">{formatTime(player.survival_time)}</div>
                 </motion.div>
               ))}

               {topPlayers.length === 0 && (
                 <div className="text-center text-teal-500 py-8 text-sm">NO DATA RECORDS FOUND</div>
               )}
            </div>
          )}
        </div>

        {/* Footer: User Stats */}
        <div className="bg-teal-950/30 border-t border-teal-500/30 p-3 flex justify-between items-center text-xs text-teal-400/80">
           <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>YOUR BEST: {formatTime(playerProfile.survival_time)}</span>
           </div>
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadData} 
            disabled={loading}
            className="h-6 text-[10px] hover:text-teal-200"
           >
             <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
             REFRESH
           </Button>
        </div>
      </motion.div>
    </div>
  );
}
