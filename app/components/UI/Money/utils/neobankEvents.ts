export interface NeobankEvent {
  eventId?: string;
  type?: string;
  payload?: {
    data?: {
      message?: Record<string, unknown>;
    };
  };
}

interface TransactionStatusMessage {
  transaction_status?: string;
}

/**
 * Parses a NeoBank WebSocket payload without trusting the provider shape.
 *
 * @param value - Raw WebSocket message data.
 * @returns A normalized event, or `null` for malformed data.
 */
export function parseNeobankEvent(value: unknown): NeobankEvent | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return null;
    }
    return parsed as NeobankEvent;
  } catch {
    return null;
  }
}

/**
 * Returns whether the event represents an Iron/MoonPay deposit completing.
 *
 * Sandbox completion is intentionally treated as UI success only. The caller
 * must not pass the sandbox transaction id to the Core vault action because it
 * is not a Monad transaction hash.
 *
 * @param event - Normalized NeoBank event.
 * @returns Whether the transaction reached `Completed`.
 */
export function isCompletedNeobankDeposit(event: NeobankEvent): boolean {
  if (event.type !== 'transaction_status') {
    return false;
  }

  const message = event.payload?.data?.message;
  if (!message) {
    return false;
  }

  const status = message.TransactionStatus;
  if (!status || Array.isArray(status) || typeof status !== 'object') {
    return false;
  }

  return (
    (status as TransactionStatusMessage).transaction_status === 'Completed'
  );
}

/**
 * Demo-only fallback Iron customer UUID for the NeoBank sandbox demo.
 *
 * `KycController.createIronCustomer` does not persist the returned Iron
 * `customer.id`, so on the Iron KYC path `moonpayCustomerId` is often unset.
 * Prefer looking the id up via `NeoBankService.getCustomerByExternalId` (profile
 * id as Iron `external_id`). This UUID (ShaneTest, Approved/Active) is only the
 * last resort so the socket still opens when lookup fails. It is only consulted
 * while the neobank flag is on and the active vendor is Iron.
 */
export const DEMO_NEOBANK_CUSTOMER_ID =
  '019ff69c-3039-77b0-9d5d-e4a3baefd7b7';

/**
 * Reads the Iron/MoonPay customer UUID from a neo-bank proxy customer payload.
 *
 * `NeoBankService.getCustomerByExternalId` returns proxy JSON shaped like
 * `{ id, external_id, ... }`; the WebSocket routing key is `id`.
 *
 * @param customer - Parsed proxy response (or unknown failure value).
 * @returns The customer UUID, or `null` when missing/malformed.
 */
export function readNeobankCustomerId(customer: unknown): string | null {
  if (customer && typeof customer === 'object') {
    const { id } = customer as { id?: unknown };
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return null;
}

/**
 * Resolves the customer id used to route the demo NeoBank socket.
 *
 * Precedence: persisted `moonpayCustomerId`, then a looked-up Iron customer id
 * (from `NeoBankService.getCustomerByExternalId`), then the
 * `NEOBANK_DEMO_CUSTOMER_ID` env override / hardcoded {@link DEMO_NEOBANK_CUSTOMER_ID}.
 *
 * @param moonpayCustomerId - Persisted Iron/MoonPay customer id, if any.
 * @param lookedUpCustomerId - Id fetched by profile/external id, if any.
 * @returns The customer id to route the demo socket.
 */
export function resolveNeobankDemoCustomerId(
  moonpayCustomerId: string | null | undefined,
  lookedUpCustomerId?: string | null,
): string {
  if (moonpayCustomerId) {
    return moonpayCustomerId;
  }
  if (lookedUpCustomerId) {
    return lookedUpCustomerId;
  }
  return process.env.NEOBANK_DEMO_CUSTOMER_ID ?? DEMO_NEOBANK_CUSTOMER_ID;
}

/**
 * Builds the dev NeoBank WebSocket URL for a MoonPay customer.
 *
 * @param customerId - MoonPay customer UUID used by the proxy as its routing key.
 * @returns WebSocket URL for the demo proxy.
 */
export function getNeobankEventsUrl(customerId: string): string {
  const baseUrl =
    process.env.NEOBANK_WS_URL ??
    'wss://on-ramp.dev-api.cx.metamask.io/neobank/events';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}userId=${encodeURIComponent(customerId)}`;
}
