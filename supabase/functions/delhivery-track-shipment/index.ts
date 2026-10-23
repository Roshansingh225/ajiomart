import {
  authenticateRequest,
  corsHeaders,
  createServiceClient,
  jsonResponse,
} from '../_shared/razorpay.ts';
import { delhiveryRequest, getDelhiveryConfig, shipmentFromTracking, trackingEventsFrom } from '../_shared/delhivery.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const { user } = await authenticateRequest(request);
    const serviceClient = createServiceClient();
    const body = await request.json();
    const orderId = String(body?.orderId || '');
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return jsonResponse({ error: 'A valid order ID is required.' }, 400);

    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('id, user_id, status, tracking_number, courier_partner')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return jsonResponse({ error: 'Order not found.' }, 404);

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (order.user_id !== user.id && profile?.role !== 'admin') {
      return jsonResponse({ error: 'You cannot view tracking for this order.' }, 403);
    }
    if (!order.tracking_number || order.courier_partner !== 'Delhivery') {
      return jsonResponse({ error: 'This order does not have a Delhivery AWB yet.' }, 409);
    }

    const config = getDelhiveryConfig();
    const url = new URL(`${config.environment === 'production' ? 'https://track.delhivery.com' : 'https://staging-express.delhivery.com'}/api/v1/packages/json/`);
    url.searchParams.set('waybill', order.tracking_number);
    url.searchParams.set('ref_ids', order.id);
    const payload = await delhiveryRequest(`${url.pathname}${url.search}`, config);
    const shipment = shipmentFromTracking(payload);
    if (!shipment) return jsonResponse({ error: 'Delhivery has not returned tracking details for this AWB yet.' }, 404);

    const statusInfo = shipment.Status;
    const currentStatus = typeof statusInfo === 'string'
      ? statusInfo
      : String((statusInfo as Record<string, unknown> | undefined)?.Status || 'Shipment manifested');
    const events = trackingEventsFrom(payload);
    const latestEvent = events[0];
    const trackingNote = [
      `Delhivery: ${currentStatus}.`,
      latestEvent?.details,
      latestEvent?.location,
    ].filter(Boolean).join(' ');
    const statusLower = currentStatus.toLowerCase();
    const isFinalOrderStatus = ['cancelled', 'delivered'].includes(order.status);
    const isDelivered = /\bdelivered\b/.test(statusLower) && !/(undelivered|rto|return)/.test(statusLower);
    const nextOrderStatus = isFinalOrderStatus
      ? order.status
      : isDelivered
        ? 'delivered'
        : /(out for delivery|in transit|picked up|dispatched|shipped)/.test(statusLower)
        ? 'shipped'
        : order.status;

    const { error: updateError } = await serviceClient
      .from('orders')
      .update({
        delhivery_status: currentStatus,
        delhivery_tracking_events: events,
        tracking_note: trackingNote,
        status: nextOrderStatus,
      })
      .eq('id', orderId);
    if (updateError) throw updateError;

    return jsonResponse({ status: currentStatus, events });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not refresh shipment tracking.' }, 400);
  }
});
