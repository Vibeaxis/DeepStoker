
import React from 'react';
import { motion } from 'framer-motion';

export default function PauseButton({ onPause, className = "" }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, textShadow: "0 0 8px rgb(255, 255, 255)" }}
      whileTap={{ scale: 0.95 }}
      onClick={onPause}
      className={`w-10 h-10 flex flex-none items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:bg-emerald-950/50 hover:border-emerald-400 transition-colors ${className}`}
      aria-label="Pause Game"
      style={{ minWidth: '40px', minHeight: '40px' }} // Touch target accessibility
    >
      <div className="flex space-x-1">
        <div className="w-1 h-4 bg-current rounded-sm shadow-[0_0_5px_currentColor]"></div>
        <div className="w-1 h-4 bg-current rounded-sm shadow-[0_0_5px_currentColor]"></div>
      </div>
    </motion.button>
  );
}
