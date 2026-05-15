import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
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

const receivedResponse = () => jsonResponse(200, { status: 'received' });

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
};

const computeHmacSha512 = async (secret: string, payload: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(signature);
};

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    status?: string;
    metadata?: {
      booking_id?: string;
    };
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Webhook ignored: non-POST method', req.method);
    return receivedResponse();
  }

  const rawBody = await req.text();
  const signature = (req.headers.get('x-paystack-signature') || '').trim().toLowerCase();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

  console.log('Incoming Paystack webhook', {
    hasSignature: !!signature,
    contentLength: rawBody.length,
  });

  if (!supabaseUrl || !serviceRoleKey || !paystackSecretKey) {
    console.error('SYSTEM ERROR:', 'Webhook config missing required environment secrets');
    return receivedResponse();
  }

  if (!signature) {
    console.error('SYSTEM ERROR:', 'Webhook rejected: missing x-paystack-signature');
    return receivedResponse();
  }

  const expectedSignature = (await computeHmacSha512(paystackSecretKey, rawBody)).toLowerCase();
  if (!timingSafeEqual(signature, expectedSignature)) {
    console.error('SYSTEM ERROR:', 'Webhook rejected: invalid signature');
    return receivedResponse();
  }

  let webhookEvent: PaystackWebhookEvent;
  try {
    webhookEvent = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    console.error('SYSTEM ERROR:', 'Webhook rejected: invalid JSON payload');
    return receivedResponse();
  }

  if (webhookEvent.event !== 'charge.success') {
    console.log('Webhook ignored: unsupported event', webhookEvent.event);
    return receivedResponse();
  }

  const reference = webhookEvent.data?.reference?.trim();
  if (!reference) {
    console.error('SYSTEM ERROR:', 'Webhook rejected: missing transaction reference');
    return receivedResponse();
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const verifyResult = await verifyResponse.json().catch(() => null);
  if (!verifyResponse.ok || !verifyResult?.status) {
    console.error('SYSTEM ERROR:', 'Paystack verification failed', verifyResult?.message || verifyResponse.statusText);
    return receivedResponse();
  }

  const verifiedStatus = String(verifyResult?.data?.status || '').toLowerCase();
  if (verifiedStatus !== 'success') {
    console.error('SYSTEM ERROR:', 'Paystack verification returned non-success status', verifiedStatus);
    return receivedResponse();
  }

  const metadata = verifyResult?.data?.metadata || webhookEvent.data?.metadata;
  const bookingId = typeof metadata?.booking_id === 'string' ? metadata.booking_id.trim() : '';
  if (!bookingId) {
    console.error('SYSTEM ERROR:', 'Webhook verification missing metadata.booking_id');
    return receivedResponse();
  }

  const paidAmountKobo = Number(verifyResult?.data?.amount);
  if (!Number.isFinite(paidAmountKobo) || paidAmountKobo <= 0) {
    console.error('SYSTEM ERROR:', 'Invalid verified payment amount');
    return receivedResponse();
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const logEvent = async (
    action: string,
    metadataPayload: Record<string, unknown>,
    actorId: string | null = null,
    actorRole: 'support' | 'client' = 'support'
  ) => {
    const { error } = await adminClient.from('booking_events').insert({
      booking_id: bookingId,
      actor_id: actorId,
      actor_role: actorRole,
      action,
      metadata: metadataPayload,
    } as any);

    if (error) {
      console.error('SYSTEM ERROR:', error);
    }
  };

  const { data: booking, error: bookingError } = await adminClient
    .from('bookings')
    .select('id, user_id, quoted_price, payment_status, status')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    console.error('SYSTEM ERROR:', 'Booking not found for webhook', { bookingId, error: bookingError?.message });
    return receivedResponse();
  }

  if (booking.payment_status === 'paid') {
    console.log('Webhook idempotency: booking already marked as paid', bookingId);
    return receivedResponse();
  }

  const normalizedStatus = String(booking.status || '').toLowerCase();
  if (!['approved', 'paid'].includes(normalizedStatus)) {
    console.error('SYSTEM ERROR:', 'Webhook invalid status transition', { bookingId, status: booking.status });
    return receivedResponse();
  }

  const expectedAmountKobo = Number(booking.quoted_price) * 100;
  if (!Number.isFinite(expectedAmountKobo) || expectedAmountKobo <= 0) {
    console.error('SYSTEM ERROR:', 'Invalid booking quoted_price for webhook amount validation', bookingId);
    return receivedResponse();
  }

  if (paidAmountKobo !== expectedAmountKobo) {
    console.error('SYSTEM ERROR:', 'Webhook amount mismatch', {
      bookingId,
      expectedAmountKobo,
      paidAmountKobo,
    });
    return receivedResponse();
  }

  const { error: updateError } = await adminClient.rpc('update_booking_secure', {
    p_booking_id: bookingId,
    p_patch: {
      payment_status: 'paid',
      status: 'paid',
      payment_reference: reference,
    },
    p_override: false,
  });

  if (updateError) {
    console.error('SYSTEM ERROR:', 'Failed to update booking from webhook', {
      bookingId,
      error: updateError.message,
    });
    return receivedResponse();
  }

  await logEvent(
    'payment_paid',
    {
      reference,
      amount_kobo: paidAmountKobo,
      source: 'webhook',
    },
    booking.user_id || null,
    booking.user_id ? 'client' : 'support'
  );

  console.log('Webhook payment update succeeded', {
    bookingId,
    reference,
    amountKobo: paidAmountKobo,
  });

  return receivedResponse();
});
