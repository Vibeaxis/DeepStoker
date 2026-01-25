import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { loadCareer, saveCareer } from '@/utils/CareerProfile';

const generateDeviceId = () => {
  return `PLAYER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export function usePlayerProfile() {
  const localCareer = loadCareer();
  
  const [profile, setProfile] = useState({
    device_id: localCareer.device_id || null,
    callsign: localCareer.playerName || 'Anonymous',
    survival_time: localCareer.totalSurvivalTime || 0,
    total_credits: localCareer.totalCredits || 0,
    current_rank: localCareer.currentRank || 'Novice',
    loading: true
  });

  useEffect(() => {
    const syncProfile = async () => {
      let career = loadCareer();
      let deviceId = career.device_id;

      if (!deviceId) {
        deviceId = generateDeviceId();
        career.device_id = deviceId;
        saveCareer(career);
        setProfile(prev => ({ ...prev, device_id: deviceId }));
      }

      try {
        // 1. Check if record exists
        const { data, error } = await supabase
          .from('deep_stoker_records')
          .select('*')
          .eq('device_id', deviceId)
          .maybeSingle(); // Safer than .single()

        if (data) {
          // === RECORD EXISTS: UPDATE IT ===
          const payload = {
            callsign: career.playerName,
            survival_time: Math.max(data.survival_time, career.totalSurvivalTime),
            total_credits: Math.max(data.total_credits, career.totalCredits),
            current_rank: career.currentRank,
            updated_at: new Date().toISOString()
          };

          // Explicit UPDATE (Fixes 409/400 errors)
          await supabase
            .from('deep_stoker_records')
            .update(payload)
            .eq('device_id', deviceId);
          
          setProfile({ ...payload, device_id: deviceId, loading: false });

        } else {
          // === RECORD MISSING: INSERT IT ===
          const newProfile = {
            device_id: deviceId,
            callsign: career.playerName || 'Anonymous',
            survival_time: career.totalSurvivalTime || 0,
            total_credits: career.totalCredits || 0,
            current_rank: career.currentRank || 'Novice'
          };

          // Explicit INSERT
          const { error: insertError } = await supabase
            .from('deep_stoker_records')
            .insert([newProfile]);

          if (insertError) {
             console.error('Insert failed:', insertError);
             // If insert fails (maybe race condition), just trust local data
          }
          
          setProfile({ ...newProfile, loading: false });
        }

      } catch (err) {
        console.warn('Network offline or DB error. Playing offline.', err);
        setProfile(prev => ({ ...prev, loading: false }));
      }
    };

    syncProfile();
  }, []);

  return profile;
}