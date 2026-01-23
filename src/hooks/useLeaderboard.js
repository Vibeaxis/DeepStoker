
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
        .order('total_credits', { ascending: false }) // Sort by credits usually implies richer/better player
        .limit(10);

      if (dbError) throw dbError;
      return data;
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
      setError('Failed to load network data.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const syncPlayerData = async (deviceId, currentData) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch current remote to compare
      const { data: remoteData, error: fetchError } = await supabase
        .from('deep_stoker_records')
        .select('survival_time, total_credits')
        .eq('device_id', deviceId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      // Logic: 
      // - Keep max survival time
      // - ALWAYS update total_credits to the latest value from local state (cumulative)
      // - Always update rank
      
      const newSurvivalTime = Math.max(remoteData?.survival_time || 0, currentData.survival_time);
      const newTotalCredits = currentData.total_credits; 

      const payload = {
        device_id: deviceId,
        callsign: currentData.callsign,
        survival_time: newSurvivalTime,
        total_credits: newTotalCredits,
        current_rank: currentData.current_rank,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('deep_stoker_records')
        .upsert(payload, { onConflict: 'device_id' });

      if (upsertError) throw upsertError;

      return true;
    } catch (err) {
      console.error('Sync error:', err);
      setError('Connection lost - sync failed.');
      toast({
        title: "Sync Failed",
        description: "Could not upload data to network.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCallsign = async (deviceId, newCallsign) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('deep_stoker_records')
        .update({ callsign: newCallsign })
        .eq('device_id', deviceId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Update callsign error:', err);
      setError('Failed to update callsign.');
      toast({
        title: "Network Error",
        description: "Could not update callsign. Please try again.",
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
