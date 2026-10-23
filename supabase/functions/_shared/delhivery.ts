export type DelhiveryConfig = {
  token: string;
  environment: 'production' | 'staging';
  clientName: string;
  pickupLocation: string;
  sellerName: string;
  sellerAddress: string;
  sellerGstin: string;
};

export function getDelhiveryConfig(): DelhiveryConfig {
  const token = Deno.env.get('DELHIVERY_API_TOKEN');
  const environment = Deno.env.get('DELHIVERY_ENV');
  const clientName = Deno.env.get('DELHIVERY_CLIENT_NAME') || '';
  const pickupLocation = Deno.env.get('DELHIVERY_PICKUP_LOCATION') || '';
  const sellerName = Deno.env.get('DELHIVERY_SELLER_NAME') || '';
  const sellerAddress = Deno.env.get('DELHIVERY_SELLER_ADDRESS') || '';
  const sellerGstin = Deno.env.get('DELHIVERY_SELLER_GSTIN') || '';

  if (!token) throw new Error('Delhivery API token is missing from Supabase secrets.');
  if (environment !== 'production' && environment !== 'staging') {
    throw new Error('Set DELHIVERY_ENV to production or staging in Supabase secrets.');
  }
  if (sellerGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(sellerGstin)) {
    throw new Error('The configured Delhivery seller GSTIN is not valid.');
  }

  return { token, environment, clientName, pickupLocation, sellerName, sellerAddress, sellerGstin };
}

export function delhiveryBaseUrl(environment: DelhiveryConfig['environment']) {
  return environment === 'production'
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com';
}

export async function delhiveryRequest(path: string, config: DelhiveryConfig, init: RequestInit = {}) {
  const response = await fetch(`${delhiveryBaseUrl(config.environment)}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${config.token}`,
      Accept: 'application/json',
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error || payload?.rmk || payload?.message || 'Delhivery request failed.';
    throw new Error(typeof message === 'string' ? message : 'Delhivery request failed.');
  }
  return payload;
}

export function trackingEventsFrom(payload: Record<string, unknown>) {
  const data = Array.isArray(payload.ShipmentData) ? payload.ShipmentData[0] : null;
  const shipment = (data as Record<string, unknown> | null)?.Shipment as Record<string, unknown> | undefined;
  const scans = Array.isArray(shipment?.Scans) ? shipment.Scans : [];

  return scans
    .map((scan) => {
      const detail = (scan as Record<string, unknown>)?.ScanDetail as Record<string, unknown> | undefined;
      return {
        status: String(detail?.Scan || detail?.ScanType || 'Shipment update'),
        details: String(detail?.Instructions || ''),
        location: String(detail?.ScannedLocation || detail?.Location || ''),
        at: String(detail?.ScanDateTime || detail?.StatusDateTime || ''),
      };
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function shipmentFromTracking(payload: Record<string, unknown>) {
  const data = Array.isArray(payload.ShipmentData) ? payload.ShipmentData[0] : null;
  return (data as Record<string, unknown> | null)?.Shipment as Record<string, unknown> | undefined;
}
