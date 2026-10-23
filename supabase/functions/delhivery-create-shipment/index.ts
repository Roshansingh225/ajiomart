import {
  authenticateRequest,
  corsHeaders,
  createServiceClient,
  jsonResponse,
} from '../_shared/razorpay.ts';
import { delhiveryRequest, getDelhiveryConfig } from '../_shared/delhivery.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  let serviceClient: ReturnType<typeof createServiceClient> | null = null;
  let orderId = '';
  let shipmentClaimed = false;
  try {
    const { user } = await authenticateRequest(request);
    serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'admin') return jsonResponse({ error: 'Only an admin can create shipments.' }, 403);

    const body = await request.json();
    orderId = String(body?.orderId || '');
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return jsonResponse({ error: 'A valid order ID is required.' }, 400);

    const config = getDelhiveryConfig();
    if (!config.clientName || !config.pickupLocation) {
      return jsonResponse({ error: 'Add the exact Delhivery registered client name and pickup-location name to Supabase secrets before creating a shipment.' }, 400);
    }
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return jsonResponse({ error: 'Order not found.' }, 404);
    if (order.status === 'cancelled') return jsonResponse({ error: 'A cancelled order cannot be shipped.' }, 409);
    if (order.payment_method === 'Online Payment' && order.payment_status !== 'paid') {
      return jsonResponse({ error: 'Online payment must be confirmed before shipment creation.' }, 409);
    }
    if (Number(order.total) > 50000 && !order.e_waybill) {
      return jsonResponse({ error: 'Add the mandatory E-way bill number for shipments above ₹50,000.' }, 400);
    }
    if (!['Cash on Delivery', 'Online Payment'].includes(order.payment_method)) {
      return jsonResponse({ error: 'Unsupported payment method for Delhivery shipment.' }, 409);
    }
    if (order.tracking_number) {
      return jsonResponse({ error: 'This order already has a tracking number.', waybill: order.tracking_number }, 409);
    }
    if (!Array.isArray(order.order_items) || order.order_items.length === 0) {
      return jsonResponse({ error: 'This order has no item details.' }, 409);
    }
    if (order.order_items.some((item: { quantity: number }) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 100)) {
      return jsonResponse({ error: 'Delhivery supports at most 100 units of one item in this shipment.' }, 400);
    }

    const address = [order.address_line1, order.address_line2, order.landmark].filter(Boolean).join(', ');
    const phone = String(order.customer_phone || '').replace(/\D/g, '').replace(/^0/, '').replace(/^91/, '');
    if (!order.customer_name || !address || !/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(order.postal_code || '')) {
      return jsonResponse({ error: 'The order needs a valid name, Indian mobile number, address, and 6-digit PIN code.' }, 400);
    }

    const packages = [
      [order.package_weight_g, 'parcel weight'],
      [order.package_length_cm, 'parcel length'],
      [order.package_width_cm, 'parcel width'],
      [order.package_height_cm, 'parcel height'],
    ];
    const missingPackageValue = packages.find(([value]) => !Number.isFinite(Number(value)) || Number(value) <= 0);
    if (missingPackageValue) {
      return jsonResponse({ error: `Enter the packed parcel ${missingPackageValue[1]} in the admin order panel.` }, 400);
    }

    const productIds = [...new Set(order.order_items.map((item: { product_id?: string }) => item.product_id).filter(Boolean))];
    const { data: products, error: productsError } = await serviceClient
      .from('products')
      .select('id, hsn_code')
      .in('id', productIds);
    if (productsError) throw productsError;
    const hsnByProduct = new Map((products || []).map((product) => [product.id, String(product.hsn_code || '').trim()]));
    const hsnCodes = order.order_items.flatMap((item: { product_id: string | null; quantity: number }) => {
      const hsn = item.product_id ? hsnByProduct.get(item.product_id) : '';
      return Array.from({ length: Number(item.quantity) || 0 }, () => hsn || '');
    });
    if (!hsnCodes.length || hsnCodes.some((code) => !/^(\d{4}|\d{6}|\d{8})$/.test(code))) {
      return jsonResponse({ error: 'Add a valid 4-8 digit HSN code to every ordered product before creating its Delhivery shipment.' }, 400);
    }

    const { data: claim, error: claimError } = await serviceClient
      .from('orders')
      .update({ delhivery_status: 'Manifesting', tracking_note: 'Creating shipment with Delhivery.' })
      .eq('id', orderId)
      .is('tracking_number', null)
      .neq('status', 'cancelled')
      .or('delhivery_status.is.null,delhivery_status.neq.Manifesting')
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claim) return jsonResponse({ error: 'Shipment creation is already running or this order already has an AWB.' }, 409);
    shipmentClaimed = true;

    const quantity = order.order_items.reduce((sum: number, item: { quantity: number }) => sum + Number(item.quantity || 0), 0);
    const description = order.order_items.map((item: { product_name: string; quantity: number }) => `${item.product_name} x${item.quantity}`).join(', ').slice(0, 240);
    const shipment = {
      client: config.clientName,
      order: order.id,
      order_date: new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 19),
      name: order.customer_name,
      phone: `91${phone}`,
      add: address,
      pin: order.postal_code,
      city: order.city,
      state: order.state,
      country: 'India',
      payment_mode: order.payment_method === 'Cash on Delivery' ? 'COD' : 'Pre-paid',
      products_desc: description,
      cod_amount: order.payment_method === 'Cash on Delivery' ? Number(order.total) : 0,
      total_amount: Number(order.total),
      quantity,
      weight: Number(order.package_weight_g),
      shipment_length: Number(order.package_length_cm),
      shipment_width: Number(order.package_width_cm),
      shipment_height: Number(order.package_height_cm),
      ...(config.sellerName ? { seller_name: config.sellerName } : {}),
      ...(config.sellerAddress ? { seller_add: config.sellerAddress } : {}),
      ...(config.sellerGstin ? { seller_gst_tin: config.sellerGstin, seller_tin: config.sellerGstin } : {}),
      hsn_code: hsnCodes.join(','),
      seller_inv: order.id.slice(0, 16),
      shipping_mode: 'Surface',
      ...(order.e_waybill ? { e_waybill: order.e_waybill } : {}),
    };
    const data = JSON.stringify({ pickup_location: { name: config.pickupLocation }, shipments: [shipment] });
    const result = await delhiveryRequest('/api/cmu/create.json', config, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ format: 'json', data }).toString(),
    });
    const manifested = Array.isArray(result?.packages) ? result.packages[0] : null;
    const waybill = String(manifested?.waybill || manifested?.AWB || result?.waybill || result?.AWB || '');
    const resultStatus = String(manifested?.status || result?.status || '').toLowerCase();
    if (!waybill || result?.success === false || (resultStatus && !['success', 'manifested', 'true'].includes(resultStatus))) {
      const remarks = manifested?.remarks;
      const detail = Array.isArray(remarks) ? remarks.filter(Boolean).join(' ') : typeof remarks === 'string' ? remarks : '';
      const providerMessage = result?.rmk || result?.error;
      throw new Error(detail || (typeof providerMessage === 'string' ? providerMessage : 'Delhivery did not return an AWB. Check the Delhivery account setup.'));
    }

    const trackingUrl = `https://www.delhivery.com/track/package/${encodeURIComponent(waybill)}`;
    const { error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'packed',
        courier_partner: 'Delhivery',
        tracking_number: waybill,
        tracking_url: trackingUrl,
        tracking_note: 'Shipment manifested with Delhivery. Tracking updates will appear here.',
        delhivery_status: String(manifested?.status || 'Manifested'),
      })
      .eq('id', orderId);
    if (updateError) throw updateError;

    return jsonResponse({ waybill, trackingUrl, status: String(manifested?.status || 'Manifested') });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the Delhivery shipment.';
    if (serviceClient && orderId && shipmentClaimed) {
      await serviceClient
        .from('orders')
        .update({
          delhivery_status: 'Manifestation failed',
          tracking_note: 'Shipment creation did not complete. Check Delhivery before retrying to avoid a duplicate AWB.',
        })
        .eq('id', orderId)
        .is('tracking_number', null);
    }
    return jsonResponse({ error: message }, 400);
  }
});
