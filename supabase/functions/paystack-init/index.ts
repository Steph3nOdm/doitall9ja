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

type InitPayload = {
  email?: string;
  amount?: number;
  booking_id?: string;
  callback_url?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  try {
    const payload = (await req.json()) as InitPayload;
    const bookingId = payload.booking_id?.trim();

    if (!bookingId) {
      return jsonResponse(400, { success: false, message: 'booking_id is required' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !paystackSecretKey) {
      return jsonResponse(500, {
        success: false,
        message: 'Missing required server secrets',
      });
    }

    if (!authHeader) {
      return jsonResponse(401, { success: false, message: 'Missing authorization token' });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { success: false, message: 'Unauthorized request' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('id, user_id, quote_status, payment_status, quoted_price, customer_email, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return jsonResponse(404, { success: false, message: 'Booking not found' });
    }

    if (booking.user_id && booking.user_id !== user.id) {
      return jsonResponse(403, { success: false, message: 'You can only pay for your own booking' });
    }

    if (booking.quote_status !== 'approved') {
      return jsonResponse(400, {
        success: false,
        message: 'Quote must be approved before payment',
      });
    }

    const normalizedStatus = String(booking.status || '').toLowerCase();
    if (!['approved', 'paid'].includes(normalizedStatus)) {
      return jsonResponse(400, {
        success: false,
        message: 'Invalid status transition',
      });
    }

    if (booking.payment_status === 'paid') {
      return jsonResponse(400, {
        success: false,
        message: 'Payment already completed',
      });
    }

    const customerEmail = (payload.email || booking.customer_email || '').trim();
    if (!customerEmail) {
      return jsonResponse(400, {
        success: false,
        message: 'Customer email is required for payment',
      });
    }

    const baseAmount = Number.isFinite(Number(booking.quoted_price))
      ? Number(booking.quoted_price)
      : Number(payload.amount);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return jsonResponse(400, { success: false, message: 'Invalid payment amount' });
    }

    const amountInKobo = Math.round(baseAmount * 100);
    const callbackUrl =
      typeof payload.callback_url === 'string' && payload.callback_url.startsWith('http')
        ? payload.callback_url
        : undefined;

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customerEmail,
        amount: amountInKobo,
        callback_url: callbackUrl,
        metadata: {
          booking_id: booking.id,
          user_id: booking.user_id || null,
        },
      }),
    });

    const paystackResult = await paystackResponse.json().catch(() => null);

    if (
      !paystackResponse.ok ||
      !paystackResult?.status ||
      !paystackResult?.data?.authorization_url ||
      !paystackResult?.data?.reference
    ) {
      return jsonResponse(400, {
        success: false,
        message: paystackResult?.message || 'Failed to initialize payment',
      });
    }

    const reference = String(paystackResult.data.reference);
    const { error: updateError } = await adminClient.rpc('update_booking_secure', {
      p_booking_id: booking.id,
      p_patch: {
        payment_status: 'pending',
        payment_reference: reference,
      },
      p_override: false,
    });

    if (updateError) {
      console.error('SYSTEM ERROR:', updateError.message);
      return jsonResponse(500, {
        success: false,
        message: updateError.message || 'Failed to update booking payment reference',
      });
    }

    return jsonResponse(200, {
      success: true,
      authorization_url: paystackResult.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error('SYSTEM ERROR:', error);
    return jsonResponse(500, {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
});
