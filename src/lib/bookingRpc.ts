import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';

type BookingPatch = Record<string, unknown>;

const isMissingRpcSignatureError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('could not find the function') || normalized.includes('function public.update_booking_secure');
};

export const updateBooking = async (
  bookingId: string,
  patch: BookingPatch,
  override = false
) => {
  ensureSupabaseConfigured();

  const primaryCall = await supabase.rpc('update_booking_secure', {
    p_booking_id: bookingId,
    p_patch: patch as any,
    p_override: override,
  });

  if (!primaryCall.error) {
    return primaryCall.data;
  }

  const primaryMessage = primaryCall.error.message || 'Failed to update booking';
  if (!isMissingRpcSignatureError(primaryMessage)) {
    console.error('SYSTEM ERROR:', primaryMessage);
    throw new Error(primaryMessage);
  }

  const fallbackCall = await supabase.rpc('update_booking_secure', {
    booking_id: bookingId,
    patch: patch as any,
    override,
  });

  if (fallbackCall.error) {
    const fallbackMessage = fallbackCall.error.message || primaryMessage;
    console.error('SYSTEM ERROR:', fallbackMessage);
    throw new Error(fallbackMessage);
  }

  return fallbackCall.data;
};
