import type {
  CheckoutPageEvent,
  ProviderCheckoutPageEventAdapter,
} from './checkoutPageEvents';

/** Matches "coinbase", "coinbase-m" and their "/providers/" forms; ideally the API would flag this. */
export function isCoinbaseProviderId(providerId: string | undefined): boolean {
  if (!providerId) return false;

  const code = providerId.replace(/^\/providers\//, '');
  return code === 'coinbase' || code.startsWith('coinbase-');
}

export const COINBASE_EVENT_PREFIX = 'onramp_api.';

/** session_error codes meaning the guest checkout limit was hit. */
export const COINBASE_LIMIT_ERROR_CODES = new Set([
  'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
  'ERROR_CODE_GUEST_TRANSACTION_COUNT',
  'ERROR_CODE_LIMITS_UPGRADE_BLOCKED',
]);

export const COINBASE_CHECKOUT_ORIGINS = ['https://pay.coinbase.com'];

export function isCoinbaseCheckoutUrl(url: string | undefined): boolean {
  if (!url) return false;

  try {
    return COINBASE_CHECKOUT_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

/** A Coinbase page event with the `onramp_api.` prefix stripped from the name. */
export interface CoinbaseCheckoutEvent {
  eventName: string;
  errorCode?: string;
  errorMessage?: string;
}

// Coinbase posts a JSON string `{ eventName, data?: { errorCode, errorMessage } }`;
// any other shape (e.g. `{ type: 'IFRAME_DETECTED' }`) yields undefined.
export function parseCoinbaseCheckoutEvent(
  data: unknown,
): CoinbaseCheckoutEvent | undefined {
  if (typeof data !== 'string') return undefined;

  try {
    const parsed = JSON.parse(data) as {
      eventName?: unknown;
      data?: { errorCode?: unknown; errorMessage?: unknown };
    };

    if (
      typeof parsed?.eventName !== 'string' ||
      !parsed.eventName.startsWith(COINBASE_EVENT_PREFIX)
    ) {
      return undefined;
    }

    return {
      eventName: parsed.eventName.slice(COINBASE_EVENT_PREFIX.length),
      errorCode:
        typeof parsed.data?.errorCode === 'string'
          ? parsed.data.errorCode
          : undefined,
      errorMessage:
        typeof parsed.data?.errorMessage === 'string'
          ? parsed.data.errorMessage
          : undefined,
    };
  } catch {
    return undefined;
  }
}

/** load_error code for an already consumed single-use checkout link. */
export const COINBASE_EXPIRED_SESSION_TOKEN = 'expired_session_token';

/** Events not listed here (load_pending, polling_start, ...) are tracked but change nothing. */
export function toCheckoutPageEvent(
  event: CoinbaseCheckoutEvent,
): CheckoutPageEvent {
  const { eventName: name, errorCode } = event;
  switch (name) {
    case 'load_success':
      return { kind: 'loaded', name, errorCode };
    case 'load_error':
      return {
        kind: 'load_failed',
        name,
        errorCode,
        ...(errorCode === COINBASE_EXPIRED_SESSION_TOKEN
          ? { reason: 'link_expired' as const }
          : {}),
      };
    case 'apple_pay_button_pressed':
    case 'google_pay_button_pressed':
    case 'pending_payment_auth':
    case 'payment_authorized':
      return { kind: 'payment_started', name, errorCode };
    case 'commit_success':
      return { kind: 'committed', name, errorCode };
    case 'polling_success':
      return { kind: 'completed', name, errorCode };
    case 'commit_error':
    case 'polling_error':
      return { kind: 'payment_failed', name, errorCode };
    case 'cancel':
      return { kind: 'cancelled', name, errorCode };
    case 'session_error':
      return {
        kind:
          errorCode && COINBASE_LIMIT_ERROR_CODES.has(errorCode)
            ? 'limit_reached'
            : 'failed',
        name,
        errorCode,
      };
    default:
      return { kind: 'tracked_only', name, errorCode };
  }
}

export const coinbaseCheckoutPageEventAdapter: ProviderCheckoutPageEventAdapter =
  {
    matches: isCoinbaseProviderId,
    isTrustedUrl: isCoinbaseCheckoutUrl,
    requiresGooglePayPreflight: true,
    singleUseCheckoutUrl: true,
    parse: (data) => {
      const parsed = parseCoinbaseCheckoutEvent(data);
      return parsed ? toCheckoutPageEvent(parsed) : undefined;
    },
  };
