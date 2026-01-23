
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { loadCareer, saveCareer } from '@/utils/CareerProfile';

const generateDeviceId = () => {
  return `PLAYER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export function usePlayerProfile() {
  const [profile, setProfile] = useState({
    device_id: null,
    callsign: 'Anonymous',
    survival_time: 0,
    total_credits: 0,
    current_rank: 'Novice',
    loading: true
  });

  useEffect(() => {
    const initializeProfile = async () => {
      // 1. Get or create device_id locally
      let career = loadCareer();
      let deviceId = career.device_id;

      if (!deviceId) {
        deviceId = generateDeviceId();
        career.device_id = deviceId;
        saveCareer(career);
      }

      // 2. Fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('deep_stoker_records')
          .select('*')
          .eq('device_id', deviceId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
          console.error('Error fetching profile:', error);
        }

        if (data) {
          // Sync remote data to local state if needed (or prefer local?)
          // For now, let's update local state with remote profile data
          setProfile({
            device_id: deviceId,
            callsign: data.callsign,
            survival_time: data.survival_time,
            total_credits: data.total_credits,
            current_rank: data.current_rank,
            loading: false
          });
        } else {
          // First time player in DB, create record
          const newProfile = {
            device_id: deviceId,
            callsign: career.playerName || 'Anonymous',
            survival_time: career.totalSurvivalTime || 0,
            total_credits: career.totalDepthCredits || 0,
            current_rank: career.currentRank || 'Novice'
          };

          const { error: insertError } = await supabase
            .from('deep_stoker_records')
            .insert([newProfile]);

          if (insertError) {
            console.error('Error creating profile:', insertError);
          }

          setProfile({ ...newProfile, loading: false });
        }
      } catch (err) {
        console.error('Unexpected error in profile init:', err);
        setProfile(prev => ({ ...prev, device_id: deviceId, loading: false }));
      }
    };

    initializeProfile();
  }, []);

  return profile;
}
