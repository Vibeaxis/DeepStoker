
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DataSyncBar({ status, onRetry, progress }) {
  // status: 'idle', 'syncing', 'success', 'error'
  
  if (status === 'idle') return null;

  return (
    <div className="w-full bg-black/80 border border-teal-500/50 rounded-lg p-4 mb-4 font-mono">
      <div className="flex items-center justify-between mb-2 text-teal-400">
        <div className="flex items-center gap-2">
          {status === 'syncing' && <Wifi className="w-4 h-4 animate-pulse" />}
          {status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          
          <span className="text-sm font-bold tracking-wider">
            {status === 'syncing' && "TRANSMITTING DATA..."}
            {status === 'success' && "DATA SYNCED"}
            {status === 'error' && "SYNC FAILED"}
          </span>
        </div>
        <span className="text-xs">{Math.round(progress)}%</span>
      </div>

      {/* Progress Bar Container */}
      <div className="relative h-2 w-full bg-teal-900/30 rounded overflow-hidden mb-2">
        {/* Fill */}
        <motion.div 
          className={`absolute top-0 left-0 h-full ${status === 'error' ? 'bg-red-500' : 'bg-teal-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Animated Data Stream Overlay */}
        {status === 'syncing' && (
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSI4Ij48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iOCIgZmlsbD0icmdiYSgwLCAyNTUsIDI1NSwgMC4yKSIvPjwvc3ZnPg==')] animate-slide-right opacity-50" />
        )}
      </div>

      {status === 'error' && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="border-red-500 text-red-400 hover:bg-red-900/20 h-8 text-xs"
          >
            RETRY TRANSMISSION
          </Button>
        </div>
      )}
    </div>
  );
}
