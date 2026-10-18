import {
  authenticateRequest,
  createServiceClient,
  corsHeaders,
  getRazorpayCredentials,
  jsonResponse,
  razorpayRequest,
} from '../_shared/razorpay.ts';

type CheckoutItem = {
  id: string;
  quantity: number;
  color?: string;
  size?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const { user, client } = await authenticateRequest(request);
    const body = await request.json();
    const shipping = body?.shipping || {};
    const inputItems = body?.items;

    const requiredShipping = [
      shipping.customerName,
      shipping.customerPhone,
      shipping.addressLine1,
      shipping.city,
      shipping.state,
    ];
    if (requiredShipping.some((value) => typeof value !== 'string' || !value.trim()) || !/^\d{6}$/.test(shipping.postalCode || '')) {
      return jsonResponse({ error: 'Enter complete delivery details and a valid 6-digit PIN code.' }, 400);
    }
    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      return jsonResponse({ error: 'Your cart is empty.' }, 400);
    }

    const items: CheckoutItem[] = inputItems.map((item: CheckoutItem) => ({
      id: String(item.id || ''),
      quantity: Number(item.quantity),
      color: String(item.color || ''),
      size: String(item.size || ''),
    }));
    if (items.some((item) => !item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
      return jsonResponse({ error: 'The cart contains an invalid quantity.' }, 400);
    }

    const requested = new Map<string, number>();
    for (const item of items) requested.set(item.id, (requested.get(item.id) || 0) + item.quantity);
    const productIds = [...requested.keys()];
    const { data: products, error: productError } = await client
      .from('products')
      .select('id, name, price, stock, active')
      .in('id', productIds);
    if (productError) throw productError;

    const productById = new Map((products || []).map((product) => [product.id, product]));
    if (productById.size !== productIds.length) {
      return jsonResponse({ error: 'A product in your cart is no longer available.' }, 409);
    }

    for (const [id, quantity] of requested) {
      const product = productById.get(id);
      if (!product?.active || Number(product.stock) < quantity) {
        return jsonResponse({ error: `Stock changed for ${product?.name || 'a product'}. Review your cart and try again.` }, 409);
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const product = productById.get(item.id);
      return sum + Math.round(Number(product.price) * 100) * item.quantity;
    }, 0);
    const discount = Math.round(subtotal * 0.1);
    const amount = subtotal - discount;
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return jsonResponse({ error: 'The order total is not valid for online payment.' }, 400);
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpayOrder = await razorpayRequest('orders', keyId, keySecret, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `ajio_${crypto.randomUUID().replaceAll('-', '').slice(0, 32)}`,
        notes: { user_id: user.id, discount_paise: String(discount), discount_percent: '10' },
      }),
    });
    if (!razorpayOrder.id || Number(razorpayOrder.amount) !== amount || razorpayOrder.currency !== 'INR') {
      throw new Error('Razorpay returned an invalid payment order.');
    }

    const serviceClient = createServiceClient();
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (profileError) throw profileError;

    const { data: session, error: sessionError } = await serviceClient
      .from('payment_sessions')
      .insert({
        user_id: user.id,
        razorpay_order_id: razorpayOrder.id,
        amount,
        currency: 'INR',
        shipping: {
          customer_name: shipping.customerName.trim(),
          customer_phone: shipping.customerPhone.trim(),
          address_line1: shipping.addressLine1.trim(),
          address_line2: String(shipping.addressLine2 || '').trim(),
          city: shipping.city.trim(),
          state: shipping.state.trim(),
          postal_code: shipping.postalCode,
          landmark: String(shipping.landmark || '').trim(),
        },
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          selected_color: item.color,
          selected_size: item.size,
        })),
      })
      .select('id')
      .single();
    if (sessionError) throw sessionError;

    return jsonResponse({
      sessionId: session.id,
      keyId,
      orderId: razorpayOrder.id,
      amount,
      currency: 'INR',
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not start online payment.' }, 400);
  }
});
