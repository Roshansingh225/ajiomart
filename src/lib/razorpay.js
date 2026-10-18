const checkoutScriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise;

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = checkoutScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load Razorpay checkout. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency,
  customer,
}) {
  await loadCheckoutScript();

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const checkout = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount,
      currency,
      name: 'Ajiomart',
      description: 'Ajiomart fashion and beauty order',
      prefill: {
        name: customer.name || '',
        email: customer.email || '',
        contact: customer.phone || '',
      },
      theme: { color: '#a7334e' },
      handler: (response) => {
        if (settled) return;
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          const error = new Error('Payment cancelled. You can retry when you are ready.');
          error.code = 'PAYMENT_CANCELLED';
          fail(error);
        },
      },
    });

    checkout.on('payment.failed', (response) => {
      const error = new Error(response?.error?.description || 'Payment was not completed. Please retry.');
      error.code = 'PAYMENT_FAILED';
      fail(error);
    });
    checkout.open();
  });
}
