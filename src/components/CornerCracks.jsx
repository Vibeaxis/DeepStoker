
import React from 'react';
import { motion } from 'framer-motion';

export default function CornerCracks({ elapsedTime, hullIntegrity, isCritical }) {
  // Logic for opacity/visibility
  // Starts appearing at 60s
  // Intensity increases with time and low hull integrity
  
  const timeFactor = Math.max(0, (elapsedTime - 60) / 180); // Slowly ramp up from 60s to 240s
  const hullFactor = Math.max(0, (100 - hullIntegrity) / 100);
  const criticalFactor = isCritical ? 0.3 : 0;
  
  const totalIntensity = Math.min(1, (timeFactor * 0.5) + hullFactor + criticalFactor);
  
  if (totalIntensity <= 0) return null;

  const crackColor = isCritical ? "#ef4444" : "#1f2937";
  const opacity = Math.min(0.9, totalIntensity);

  // Four corner cracks
  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      {/* Top Left */}
      <motion.div 
        className="absolute top-0 left-0 w-64 h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        transition={{ duration: 1 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full transform -scale-x-100">
          <path d="M0 0 L40 10 L20 30 L50 40 L30 70 L60 80" fill="none" stroke={crackColor} strokeWidth="2" filter="url(#glow)" />
          <path d="M0 5 L30 15 L10 35" fill="none" stroke={crackColor} strokeWidth="1" filter="url(#glow)" />
        </svg>
      </motion.div>

      {/* Top Right */}
      <motion.div 
        className="absolute top-0 right-0 w-64 h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        transition={{ duration: 1 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
           <path d="M100 0 L60 10 L80 30 L50 40 L70 70 L40 80" fill="none" stroke={crackColor} strokeWidth="2" filter="url(#glow)" />
           <path d="M100 5 L70 15 L90 35" fill="none" stroke={crackColor} strokeWidth="1" filter="url(#glow)" />
        </svg>
      </motion.div>

      {/* Bottom Left */}
      <motion.div 
        className="absolute bottom-0 left-0 w-64 h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        transition={{ duration: 1 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full transform rotate-180">
           <path d="M100 0 L60 10 L80 30 L50 40 L70 70 L40 80" fill="none" stroke={crackColor} strokeWidth="2" filter="url(#glow)" />
        </svg>
      </motion.div>

      {/* Bottom Right */}
      <motion.div 
        className="absolute bottom-0 right-0 w-64 h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        transition={{ duration: 1 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full transform rotate-180 -scale-x-100">
           <path d="M0 0 L40 10 L20 30 L50 40 L30 70 L60 80" fill="none" stroke={crackColor} strokeWidth="2" filter="url(#glow)" />
        </svg>
      </motion.div>

      <svg width="0" height="0">
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </svg>
    </div>
  );
}
