import { useState, useCallback } from 'react';
import { createBooking } from '@/lib/supabase';
import type { Booking } from '@/types/database';

interface BookingFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  address: string;
  city: string;
  description: string;
  preferred_date?: string;
  preferred_time?: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  budget_amount?: number;
  job_type?: 'inspection' | 'fixed';
  quote_status?: 'pending' | 'quoted' | 'approved' | 'rejected';
  payment_status?: 'pending' | 'paid' | 'failed';
}

export function useBookings() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);

  const submitBooking = useCallback(async (formData: BookingFormData): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = await createBooking({
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        service_id: formData.service_id,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        urgency: formData.urgency,
        budget_type: formData.budget_type,
        budget_amount: formData.budget_amount,
        job_type: formData.job_type,
        quote_status: formData.quote_status,
        payment_status: formData.payment_status,
      });
      setLastBooking(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit booking');
      console.error('Error creating booking:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLastBooking = useCallback(() => {
    setLastBooking(null);
  }, []);

  return {
    submitBooking,
    isSubmitting,
    error,
    lastBooking,
    clearError,
    clearLastBooking,
  };
}



