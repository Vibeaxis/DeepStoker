
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Star, ChevronsUp } from 'lucide-react';

export default function PromotionModal({ show, newRank, onAccept }) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-lg bg-black/90 border-4 border-emerald-500 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.4)]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {/* Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
          
          <div className="p-8 text-center relative z-10 flex flex-col items-center">
            
            <motion.div
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="mb-4"
            >
               <ChevronsUp className="w-20 h-20 text-emerald-400 animate-pulse" />
            </motion.div>

            <h2 
              className="text-5xl font-black text-emerald-400 mb-6 tracking-wider" 
              style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 20px rgba(16, 185, 129, 0.8)' }}
            >
              PROMOTION!
            </h2>
            
            <p className="text-emerald-200 text-lg mb-2">ACCESS LEVEL INCREASED</p>
            <p className="text-white text-xl mb-8">
              You are now <span className="font-bold text-emerald-400">{newRank}</span>
            </p>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-emerald-900/30 border border-emerald-500/50 rounded-xl p-6 mb-8 w-full"
            >
              <div className="text-sm text-emerald-300 mb-1 uppercase tracking-widest">Performance Bonus</div>
              <div 
                className="text-4xl font-bold text-emerald-300 drop-shadow-[0_0_10px_rgba(110,231,183,0.5)]"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                +1,000 DEPTH CREDITS
              </div>
            </motion.div>
            
            <Button 
              onClick={onAccept}
              className="w-full h-14 text-xl font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all transform hover:scale-105"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              <Check className="w-6 h-6 mr-2" />
              ACCEPT PROMOTION
            </Button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
