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
      return [];
    } finally {
      setLoading(false);
    }
  };

  const syncPlayerData = async (deviceId, currentData) => {
    if (!deviceId) return false;

    setLoading(true);
    try {
      // 1. Check if record exists
      const { data: existing, error: checkError } = await supabase
        .from('deep_stoker_records')
        .select('id, survival_time')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (checkError) throw checkError;

      // 2. SANITIZE INPUTS (This fixes the 400 Bad Request)
      // If currentData.total_credits is undefined, force it to 0.
      const safeCredits = Number.isFinite(currentData.total_credits) ? currentData.total_credits : 0;
      const safeSurvival = Math.max(
        existing?.survival_time || 0, 
        Number.isFinite(currentData.survival_time) ? currentData.survival_time : 0
      );
      
      // 3. Prepare Base Payload (Data to save)
      const basePayload = {
        callsign: currentData.callsign || 'Anonymous',
        survival_time: safeSurvival,
        total_credits: safeCredits,
        current_rank: currentData.current_rank || 'Novice',
        updated_at: new Date().toISOString()
      };

      // 4. Update or Insert
      if (existing) {
        // UPDATE: Do NOT send 'device_id' in the body (we query BY it, we don't change it)
        const { error: updateError } = await supabase
          .from('deep_stoker_records')
          .update(basePayload)
          .eq('device_id', deviceId);
          
        if (updateError) throw updateError;
      } else {
        // INSERT: MUST include 'device_id' so the DB knows who this is
        const { error: insertError } = await supabase
          .from('deep_stoker_records')
          .insert([{ ...basePayload, device_id: deviceId }]);
          
        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.warn('Sync warning:', err.message);
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