import { useState, useEffect, useCallback } from 'react';
import { supabase, fetchReviews } from '@/lib/supabase';
import type { Review } from '@/types/database';

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReviews();
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('reviews-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reviews' }, 
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadReviews]);

  return { reviews, isLoading, error, refetch: loadReviews };
}
