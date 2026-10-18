import {
  authenticateRequest,
  createServiceClient,
  getRazorpayCredentials,
  jsonResponse,
  razorpayRequest,
  verifyRazorpaySignature,
} from '../_shared/razorpay.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const { user } = await authenticateRequest(request);
    const body = await request.json();
    const { sessionId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body || {};
    if (!sessionId || !orderId || !paymentId || !signature) {
      return jsonResponse({ error: 'Razorpay payment details are incomplete.' }, 400);
    }

    const serviceClient = createServiceClient();
    const { data: session, error: sessionError } = await serviceClient
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return jsonResponse({ error: 'Payment session not found. Start checkout again.' }, 404);

    if (session.status === 'completed') {
      if (session.razorpay_payment_id !== paymentId || session.order_id == null) {
        return jsonResponse({ error: 'This payment session has already been completed.' }, 409);
      }
      const { data: completedOrder, error: completionError } = await serviceClient.rpc('complete_razorpay_order', {
        p_session_id: session.id,
        p_razorpay_payment_id: paymentId,
      });
      if (completionError) throw completionError;
      return jsonResponse(completedOrder);
    }
    if (session.status !== 'pending' || session.razorpay_order_id !== orderId) {
      return jsonResponse({ error: 'This payment attempt is no longer active. Start checkout again.' }, 409);
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    const validSignature = await verifyRazorpaySignature(orderId, paymentId, signature, keySecret);
    if (!validSignature) return jsonResponse({ error: 'Payment signature could not be verified.' }, 400);

    let payment = await razorpayRequest(`payments/${encodeURIComponent(paymentId)}`, keyId, keySecret);
    if (payment.order_id !== session.razorpay_order_id
      || Number(payment.amount) !== Number(session.amount)
      || payment.currency !== session.currency) {
      return jsonResponse({ error: 'The payment details do not match this order. Contact Ajiomart support.' }, 409);
    }

    if (payment.status === 'authorized') {
      payment = await razorpayRequest(`payments/${encodeURIComponent(paymentId)}/capture`, keyId, keySecret, {
        method: 'POST',
        body: JSON.stringify({ amount: session.amount, currency: session.currency }),
      });
    }
    if (payment.status !== 'captured') {
      return jsonResponse({
        error: 'Payment is not captured yet. Retry the payment from checkout.',
        code: 'PAYMENT_NOT_CAPTURED',
      }, 409);
    }

    const { data: completedOrder, error: completionError } = await serviceClient.rpc('complete_razorpay_order', {
      p_session_id: session.id,
      p_razorpay_payment_id: paymentId,
    });
    if (!completionError) return jsonResponse(completedOrder);

    await serviceClient
      .from('payment_sessions')
      .update({ status: 'refund_pending', razorpay_payment_id: paymentId })
      .eq('id', session.id);

    let refundRequested = false;
    try {
      await razorpayRequest(`payments/${encodeURIComponent(paymentId)}/refund`, keyId, keySecret, {
        method: 'POST',
        body: JSON.stringify({
          amount: session.amount,
          notes: { reason: 'Ajiomart could not confirm item availability.' },
        }),
      });
      refundRequested = true;
    } catch {
      // Support can resolve a failed automatic refund from the Razorpay dashboard.
    }

    return jsonResponse({
      error: refundRequested
        ? 'Payment succeeded, but stock changed before order confirmation. A refund has been requested.'
        : 'Payment succeeded, but automatic order confirmation and refund need support assistance.',
      code: 'PAID_ORDER_NEEDS_SUPPORT',
      refundRequested,
    }, 409);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not verify this payment.' }, 400);
  }
});
