
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function EmergencyPurgeButton({ show, onPurge }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute z-50 top-1/2 -right-32 transform -translate-y-1/2"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPurge}
            className="relative w-24 h-24 rounded-full bg-red-600 border-4 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.8)] flex flex-col items-center justify-center overflow-hidden group cursor-pointer"
          >
            {/* Pulsing effect */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-red-500 rounded-full"
            />
            
            <div className="relative z-10 flex flex-col items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white mb-1" />
              <span className="text-[10px] font-bold text-white text-center leading-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                EMERGENCY<br/>PURGE
              </span>
            </div>
            
            {/* Striped warning background */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)'
              }}
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
