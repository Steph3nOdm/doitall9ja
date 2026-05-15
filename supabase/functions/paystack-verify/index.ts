import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

type VerifyPayload = {
  reference?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  try {
    const payload = (await req.json()) as VerifyPayload;
    const reference = payload.reference?.trim();

    if (!reference) {
      return jsonResponse(400, { success: false, message: 'reference is required' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey || !paystackSecretKey) {
      return jsonResponse(500, {
        success: false,
        message: 'Missing required server secrets',
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const logEvent = async (
      bookingId: string,
      action: string,
      metadata: Record<string, unknown>,
      actorId: string | null = null,
      actorRole: 'support' | 'client' = 'support'
    ) => {
      const { error } = await adminClient.from('booking_events').insert({
        booking_id: bookingId,
        actor_id: actorId,
        actor_role: actorRole,
        action,
        metadata,
      } as any);

      if (error) {
        console.error('SYSTEM ERROR:', error);
      }
    };

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paystackResult = await paystackResponse.json().catch(() => null);
    const metadata = paystackResult?.data?.metadata;
    const bookingId =
      typeof metadata?.booking_id === 'string' ? metadata.booking_id.trim() : '';

    if (!paystackResponse.ok || !paystackResult?.status || !bookingId) {
      return jsonResponse(400, {
        success: false,
        message: paystackResult?.message || 'Payment verification failed',
      });
    }

    const transactionStatus = String(paystackResult?.data?.status || '').toLowerCase();

    if (transactionStatus === 'success') {
      const { data: booking, error: bookingError } = await adminClient
        .from('bookings')
        .select('id, user_id, status, payment_status')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        return jsonResponse(404, {
          success: false,
          message: bookingError?.message || 'Booking not found',
        });
      }

      if (booking.payment_status === 'paid') {
        return jsonResponse(200, {
          success: true,
          booking_id: bookingId,
          payment_status: 'paid',
        });
      }

      const normalizedStatus = String(booking.status || '').toLowerCase();
      if (!['approved', 'paid'].includes(normalizedStatus)) {
        return jsonResponse(400, {
          success: false,
          message: 'Invalid status transition',
        });
      }

      const { error: updateError } = await adminClient.rpc('update_booking_secure', {
        p_booking_id: bookingId,
        p_patch: {
          payment_status: 'paid',
          payment_reference: reference,
          status: 'paid',
        },
        p_override: false,
      });

      if (updateError) {
        return jsonResponse(500, {
          success: false,
          message: updateError.message || 'Failed to update booking payment status',
        });
      }

      await logEvent(
        bookingId,
        'payment_paid',
        { reference },
        booking.user_id || null,
        booking.user_id ? 'client' : 'support'
      );

      return jsonResponse(200, {
        success: true,
        booking_id: bookingId,
        payment_status: 'paid',
      });
    }

    const { error: failedUpdateError } = await adminClient.rpc('update_booking_secure', {
      p_booking_id: bookingId,
      p_patch: {
        payment_status: 'failed',
        payment_reference: reference,
      },
      p_override: false,
    });

    if (failedUpdateError) {
      console.error('SYSTEM ERROR:', failedUpdateError.message);
    }

    await logEvent(bookingId, 'payment_failed', { reference, status: transactionStatus });

    return jsonResponse(400, {
      success: false,
      booking_id: bookingId,
      payment_status: 'failed',
      message: paystackResult?.data?.gateway_response || 'Payment not successful',
    });
  } catch (error) {
    console.error('SYSTEM ERROR:', error);
    return jsonResponse(500, {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
});
