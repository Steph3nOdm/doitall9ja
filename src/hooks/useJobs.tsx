import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Job, JobStatus } from '@/types/database';

interface CreateJobData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: string;
  address: string;
  budget?: number;
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferred_date?: string;
  preferred_time?: string;
}

const getErrorText = (error: unknown) => {
  if (!error || typeof error !== 'object') return '';
  const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
  return [e.code, e.message, e.details, e.hint]
    .map((part) => String(part || ''))
    .join(' ')
    .toLowerCase();
};

const hasMissingColumnSignal = (error: unknown, columns: string[]) => {
  const errorText = getErrorText(error);
  const code = String((error as { code?: unknown } | null)?.code || '').toUpperCase();
  if (code === 'PGRST204' || code === '42703') return true;
  return columns.some((column) => errorText.includes(column.toLowerCase()));
};

// Hook for clients to manage their jobs
export function useClientJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setJobs(data as Job[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createJob = async (jobData: CreateJobData) => {
    if (!user) throw new Error('Not authenticated');

    const fullPayload = {
      ...jobData,
      client_id: user.id,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert(fullPayload as any)
      .select()
      .single();

    let createdJob = data as Job | null;

    if (error) {
      // Backward compatibility for older DB schemas missing newer optional job columns.
      if (
        hasMissingColumnSignal(error, [
          'budget_type',
          'urgency',
          'preferred_date',
          'preferred_time',
          'location',
          'subcategory',
        ])
      ) {
        const minimalPayload = {
          client_id: user.id,
          status: 'pending',
          title: jobData.title,
          description: jobData.description,
          category: jobData.category,
          address: jobData.address,
        };

        const { data: retryData, error: retryError } = await supabase
          .from('jobs')
          .insert(minimalPayload as any)
          .select()
          .single();

        if (retryError) throw retryError;
        createdJob = retryData as Job;
      } else {
        throw error;
      }
    }
    
    await fetchJobs();
    
    return createdJob as Job;
  };

  const cancelJob = async (jobId: string, reason: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId)
      .eq('client_id', user?.id);
    
    if (error) throw error;
    await fetchJobs();
  };

  const confirmCompletion = async (jobId: string, rating: number, review: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        client_rating: rating,
        client_review: review,
      } as any)
      .eq('id', jobId)
      .eq('client_id', user?.id);
    
    if (error) throw error;
    await fetchJobs();
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`client-jobs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `client_id=eq.${user.id}`,
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    fetchJobs,
    createJob,
    cancelJob,
    confirmCompletion,
    activeJobs: jobs.filter(j => ['pending', 'assigned', 'accepted', 'in_progress'].includes(j.status)),
    completedJobs: jobs.filter(j => ['completed', 'confirmed'].includes(j.status)),
    pastJobs: jobs.filter(j => ['cancelled', 'confirmed'].includes(j.status)),
  };
}

// Hook for technicians to manage available and assigned jobs
export function useTechnicianJobs() {
  const { user, profile } = useAuth();
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableJobs = useCallback(async () => {
    if (!user || !profile?.skills) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .in('status', ['pending', 'assigned'])
        .is('technician_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const filtered = (data as Job[] || []).filter(job => 
        profile.skills?.some(skill => 
          job.category.toLowerCase().includes(skill.toLowerCase())
        )
      );
      
      setAvailableJobs(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  const fetchMyJobs = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('technician_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMyJobs(data as Job[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const acceptJob = async (jobId: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('jobs')
      .update({
        technician_id: user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId)
      .in('status', ['pending', 'assigned']);
    
    if (error) throw error;
    
    await Promise.all([fetchAvailableJobs(), fetchMyJobs()]);
  };

  const rejectJob = async (_jobId: string, _reason: string) => {
    await fetchAvailableJobs();
  };

  const startJob = async (jobId: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId)
      .eq('technician_id', user?.id);
    
    if (error) throw error;
    await fetchMyJobs();
  };

  const completeJob = async (jobId: string, _notes?: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId)
      .eq('technician_id', user?.id);
    
    if (error) throw error;
    await fetchMyJobs();
  };

  useEffect(() => {
    if (user && profile?.role === 'technician') {
      fetchAvailableJobs();
      fetchMyJobs();
    }
  }, [user, profile, fetchAvailableJobs, fetchMyJobs]);

  return {
    availableJobs,
    myJobs,
    isLoading,
    error,
    fetchAvailableJobs,
    fetchMyJobs,
    acceptJob,
    rejectJob,
    startJob,
    completeJob,
    activeJobs: myJobs.filter(j => ['accepted', 'in_progress'].includes(j.status)),
    completedJobs: myJobs.filter(j => ['completed', 'confirmed'].includes(j.status)),
  };
}

// Hook for admin to manage all jobs
export function useAdminJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllJobs = useCallback(async (filters?: {
    status?: JobStatus;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setJobs(data as Job[] || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const assignJob = async (jobId: string, technicianId: string) => {
    if (!technicianId) {
      throw new Error('No technician selected');
    }

    const payload = {
      technician_id: technicianId,
      assigned_by: user?.id,
      status: 'assigned',
    };

    console.log('Payload:', {
      job_id: jobId,
      technician_id: technicianId,
      assigned_by: user?.id,
      status: payload.status,
    });

    const { data, error } = await supabase
      .from('jobs')
      .update(payload as any)
      .eq('id', jobId)
      .is('technician_id', null)
      .select('id');

    if (error) {
      console.error('SYSTEM ERROR:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Job already assigned');
    }

    await fetchAllJobs();
  };

  const unassignJob = async (jobId: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        technician_id: null,
        assigned_by: null,
        status: 'pending',
      } as any)
      .eq('id', jobId);
    
    if (error) throw error;
    await fetchAllJobs();
  };

  const disputeJob = async (jobId: string, _reason: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'disputed',
      } as any)
      .eq('id', jobId);
    
    if (error) throw error;
    await fetchAllJobs();
  };

  const resolveDispute = async (jobId: string, _resolution: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
      } as any)
      .eq('id', jobId);
    
    if (error) throw error;
    await fetchAllJobs();
  };

  return {
    jobs,
    isLoading,
    fetchAllJobs,
    assignJob,
    unassignJob,
    disputeJob,
    resolveDispute,
    pendingJobs: jobs.filter(j => j.status === 'pending'),
    assignedJobs: jobs.filter(j => j.status === 'assigned'),
    inProgressJobs: jobs.filter(j => j.status === 'in_progress'),
    completedJobs: jobs.filter(j => ['completed', 'confirmed'].includes(j.status)),
    disputedJobs: jobs.filter(j => j.status === 'disputed'),
  };
}
