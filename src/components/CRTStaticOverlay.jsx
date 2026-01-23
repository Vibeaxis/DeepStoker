
import React from 'react';

export default function CRTStaticOverlay({ isPaused, onResume }) {
  if (!isPaused) return null;

  return (
    <div 
      onClick={onResume}
      className="fixed inset-0 z-[100] bg-black cursor-pointer flex items-center justify-center overflow-hidden"
    >
      {/* Noise Layer */}
      <div className="absolute inset-0 opacity-20 animate-noise bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150 contrast-150"></div>
      
      {/* Scanlines */}
      <div className="absolute inset-0 z-10 opacity-30" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 6px 100%' }}></div>
      
      {/* Moving Scanline Bar */}
      <div className="absolute inset-0 z-20 animate-scanline pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent h-[20%] w-full"></div>

      {/* Content */}
      <div className="relative z-30 text-center">
         <h1 className="text-4xl md:text-6xl font-black text-white/90 tracking-widest animate-pulse" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 10px white' }}>
            SIGNAL LOST
         </h1>
         <p className="mt-4 text-emerald-400/80 font-mono text-sm md:text-base animate-pulse">
            TAP SCREEN TO RE-INITIALIZE FEED
         </p>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: -20%; }
          100% { top: 120%; }
        }
        .animate-scanline {
          animation: scanline 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
