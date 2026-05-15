import { useState, useEffect, useCallback } from 'react';
import { supabase, fetchServices } from '@/lib/supabase';
import type { Service } from '@/types/database';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchServices();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
      console.error('Error fetching services:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('services-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'services' }, 
        () => {
          loadServices();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadServices]);

  return { services, isLoading, error, refetch: loadServices };
}
