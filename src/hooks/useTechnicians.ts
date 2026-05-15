import { useState, useEffect, useCallback } from 'react';
import { supabase, fetchTechnicians } from '@/lib/supabase';
import type { Technician } from '@/types/database';

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTechnicians = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTechnicians();
      setTechnicians(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch technicians');
      console.error('Error fetching technicians:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('technicians-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.technician' }, 
        () => {
          loadTechnicians();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadTechnicians]);

  return { technicians, isLoading, error, refetch: loadTechnicians };
}
