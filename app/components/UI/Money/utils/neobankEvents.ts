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
