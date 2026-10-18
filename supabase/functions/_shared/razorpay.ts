import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function createUserClient(authorization: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) throw new Error('Supabase function configuration is incomplete.');

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}

export function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('Supabase function configuration is incomplete.');

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getRazorpayCredentials() {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) throw new Error('Razorpay test credentials are not configured on Supabase.');
  return { keyId, keySecret };
}

export async function razorpayRequest(path: string, keyId: string, keySecret: string, init?: RequestInit) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.error?.description || 'Razorpay could not complete this request.';
    throw new Error(message);
  }
  return result;
}

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) throw new Error('Please sign in before paying.');

  const client = createUserClient(authorization);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Your session expired. Sign in again.');
  return { client, user: data.user };
}

export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${orderId}|${paymentId}`));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (expected.length !== signature.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}
