import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function useLeaderboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchTopPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('deep_stoker_records')
        .select('callsign, survival_time, current_rank, total_credits')
        .order('total_credits', { ascending: false })
        .limit(10);

      if (dbError) throw dbError;
      return data;
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
      // Don't show toast for this, just fail silently in UI
      return [];
    } finally {
      setLoading(false);
    }
  };

  const syncPlayerData = async (deviceId, currentData) => {
    // If no deviceId, we can't sync. Silent fail.
    if (!deviceId) return false;

    setLoading(true);
    try {
      // 1. Check if record exists first (Avoids 409/400 errors from upsert)
      const { data: existing, error: checkError } = await supabase
        .from('deep_stoker_records')
        .select('id, survival_time')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (checkError) throw checkError;

      // 2. Prepare Payload
      const newSurvivalTime = Math.max(existing?.survival_time || 0, currentData.survival_time);
      
      const payload = {
        device_id: deviceId,
        callsign: currentData.callsign || 'Anonymous',
        survival_time: newSurvivalTime,
        total_credits: currentData.total_credits,
        current_rank: currentData.current_rank,
        updated_at: new Date().toISOString()
      };

      // 3. Update or Insert
      if (existing) {
        const { error: updateError } = await supabase
          .from('deep_stoker_records')
          .update(payload)
          .eq('device_id', deviceId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('deep_stoker_records')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.warn('Sync warning (Network may be down):', err.message);
      // Suppress the toast error so it doesn't annoy the player
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCallsign = async (deviceId, newCallsign) => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('deep_stoker_records')
        .update({ callsign: newCallsign })
        .eq('device_id', deviceId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Update callsign error:', err);
      toast({
        title: "Network Error",
        description: "Could not update callsign. Local save updated.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchTopPlayers,
    syncPlayerData,
    updateCallsign,
    loading,
    error
  };
}