
import React from 'react';
import { motion } from 'framer-motion';

export default function StructuralStabilityMeter({ integrity }) {
  // Determine color based on integrity
  let color = '#10b981'; // Green
  let labelColor = 'text-emerald-400';
  
  if (integrity < 25) {
    color = '#ef4444'; // Red
    labelColor = 'text-red-500 animate-pulse';
  } else if (integrity < 50) {
    color = '#f97316'; // Orange
    labelColor = 'text-orange-400';
  } else if (integrity < 75) {
    color = '#eab308'; // Yellow
    labelColor = 'text-yellow-400';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[10px] md:text-xs font-bold ${labelColor}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
          STRUCTURAL STABILITY
        </span>
        <span className="text-[10px] md:text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          {Math.round(integrity)}%
        </span>
      </div>
      
      <div className="h-2 md:h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-700 relative">
        <div 
          className="absolute inset-0 z-10 opacity-30" 
          style={{ backgroundImage: 'linear-gradient(90deg, transparent 19px, rgba(0,0,0,0.8) 20px)', backgroundSize: '20px 100%' }}
        />
        
        <motion.div
          className="h-full relative"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          initial={{ width: '100%' }}
          animate={{ width: `${integrity}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 10 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[50%] bg-white opacity-20"></div>
        </motion.div>
      </div>
    </div>
  );
}
