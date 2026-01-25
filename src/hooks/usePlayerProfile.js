import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { loadCareer, saveCareer } from '@/utils/CareerProfile';

const generateDeviceId = () => {
  return `PLAYER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export function usePlayerProfile() {
  // 1. INITIALIZE FROM LOCAL STORAGE IMMEDIATELY
  // This prevents the "Novice" flash and protects your data if the network fails.
  const localCareer = loadCareer();
  
  const [profile, setProfile] = useState({
    device_id: localCareer.device_id || null,
    callsign: localCareer.playerName || 'Anonymous',
    survival_time: localCareer.totalSurvivalTime || 0,
    total_credits: localCareer.totalCredits || 0,
    current_rank: localCareer.currentRank || 'Novice',
    loading: true // Keep loading true strictly for network sync status
  });

  useEffect(() => {
    const syncProfile = async () => {
      let career = loadCareer();
      let deviceId = career.device_id;

      // 1. Ensure Device ID exists
      if (!deviceId) {
        deviceId = generateDeviceId();
        career.device_id = deviceId;
        saveCareer(career);
        // Update local state immediately
        setProfile(prev => ({ ...prev, device_id: deviceId }));
      }

      try {
        // 2. Try to fetch remote data
        const { data, error } = await supabase
          .from('deep_stoker_records')
          .select('*')
          .eq('device_id', deviceId)
          .single();

        if (data) {
          // REMOTE EXISTS:
          // We usually trust LOCAL for 'active' progress, but we can sync here.
          // For now, let's trust LOCAL data for rank/credits as authoritative 
          // (since you just played), but update the DB to match us.
          
          const payload = {
            device_id: deviceId,
            callsign: career.playerName,
            survival_time: Math.max(data.survival_time, career.totalSurvivalTime),
            total_credits: Math.max(data.total_credits, career.totalCredits),
            current_rank: career.currentRank, // Local rank is king
            updated_at: new Date().toISOString()
          };

          // Silent background sync
          await supabase.from('deep_stoker_records').upsert(payload);
          
          setProfile({
            ...payload,
            loading: false
          });

        } else if (error && error.code === 'PGRST116') {
          // RECORD MISSING (PGRST116): Create it safely using UPSERT
          // Upsert prevents 409 errors if two requests happen at once
          const newProfile = {
            device_id: deviceId,
            callsign: career.playerName || 'Anonymous',
            survival_time: career.totalSurvivalTime || 0,
            total_credits: career.totalCredits || 0,
            current_rank: career.currentRank || 'Novice'
          };

          const { error: upsertError } = await supabase
            .from('deep_stoker_records')
            .upsert(newProfile, { onConflict: 'device_id' });

          if (upsertError) console.error('Sync error:', upsertError);
          
          setProfile({ ...newProfile, loading: false });
        
        } else {
          // GENERIC NETWORK ERROR (406, 500, etc)
          // DO NOT RESET PROFILE. Just keep using local data.
          console.warn('Network issue fetching profile, sticking to local data:', error);
          setProfile(prev => ({ ...prev, loading: false }));
        }

      } catch (err) {
        console.error('Critical profile error:', err);
        // Fallback: Ensure UI is at least usable with local data
        setProfile(prev => ({ ...prev, loading: false }));
      }
    };

    syncProfile();
  }, []);

  return profile;
}