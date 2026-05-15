import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';

type BookingEventRole = 'admin' | 'support' | 'technician' | 'client';

type LogBookingEventPayload = {
  booking_id: string;
  actor_id: string;
  actor_role: BookingEventRole;
  action: string;
  metadata?: Record<string, unknown>;
};

export const logBookingEvent = async (payload: LogBookingEventPayload) => {
  try {
    ensureSupabaseConfigured();
    const { error } = await supabase
      .from('booking_events')
      .insert({
        booking_id: payload.booking_id,
        actor_id: payload.actor_id,
        actor_role: payload.actor_role,
        action: payload.action,
        metadata: payload.metadata || {},
      } as any);

    if (error) {
      console.error('SYSTEM ERROR:', error);
    }
  } catch (error) {
    console.error('SYSTEM ERROR:', error);
  }
};
