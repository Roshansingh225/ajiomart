const ONLINE_PAYMENT = 'Online Payment';
const CASH_ON_DELIVERY = 'Cash on Delivery';

export function calculateOrderPricing(subtotal, paymentMethod) {
  const subtotalPaise = Math.max(0, Math.round(Number(subtotal || 0) * 100));
  const discountPaise = paymentMethod === ONLINE_PAYMENT ? Math.round(subtotalPaise * 0.1) : 0;
  const codChargesPaise = paymentMethod === CASH_ON_DELIVERY ? 2000 : 0;

  return {
    subtotal: subtotalPaise / 100,
    discount: discountPaise / 100,
    codCharges: codChargesPaise / 100,
    total: (subtotalPaise - discountPaise + codChargesPaise) / 100,
  };
}
