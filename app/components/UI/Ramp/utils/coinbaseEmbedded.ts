import type { Quote } from '@metamask/ramps-controller';

/**
 * Fallback buy widget entry the API returns on a Coinbase quote so the
 * embedded checkout can hand the user to the hosted Coinbase widget when
 * Coinbase reports a per-user limit. Not yet part of the published
 * `BuyWidget` type in `@metamask/ramps-controller`.
 */
export interface BuyWidgetFallback {
  url: string;
  browser: 'IN_APP_OS_BROWSER' | 'APP_BROWSER';
}

/**
 * Buy widget shape that may include the API-only `fallback` field.
 * Used for reading the optional field from quote.quote.buyWidget at runtime.
 */
interface BuyWidgetWithFallback {
  fallback?: BuyWidgetFallback;
}

/**
 * Gets the hosted-widget fallback for a Coinbase quote when present.
 * The fallback lets the embedded checkout hand off to the hosted Coinbase
 * widget after Coinbase reports a per-user guest checkout limit.
 *
 * @param quote - The quote that may include quote.buyWidget.fallback.
 * @returns The fallback buy widget, or undefined when absent or empty.
 */
export function getQuoteBuyWidgetFallback(
  quote: Quote,
): BuyWidgetFallback | undefined {
  const fallback = (quote.quote?.buyWidget as BuyWidgetWithFallback | undefined)
    ?.fallback;
  return fallback?.url ? fallback : undefined;
}

/**
 * Whether a quote's provider id is a Coinbase provider (e.g. "coinbase",
 * "coinbase-m", or the same with a "/providers/" prefix). Coinbase quotes
 * open the embedded checkout, whose page events Checkout parses. Ideally the
 * API would flag this on the quote; until then this is the single place the
 * check lives.
 *
 * @param providerId - The quote's `provider` id.
 * @returns True for a Coinbase provider id.
 */
export function isCoinbaseProviderId(providerId: string | undefined): boolean {
  if (!providerId) return false;

  const code = providerId.replace(/^\/providers\//, '');
  return code === 'coinbase' || code.startsWith('coinbase-');
}

/**
 * Prefix Coinbase's embedded checkout page uses on every event name it
 * posts from the top frame (e.g. "onramp_api.load_success").
 */
export const COINBASE_EVENT_PREFIX = 'onramp_api.';

/**
 * Coinbase session_error codes that mean the guest checkout limit was hit
 * and the user should be offered the hosted-widget fallback.
 */
export const COINBASE_LIMIT_ERROR_CODES = new Set([
  'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
  'ERROR_CODE_GUEST_TRANSACTION_COUNT',
  'ERROR_CODE_LIMITS_UPGRADE_BLOCKED',
]);

/**
 * Origins the Coinbase embedded checkout page events are trusted from.
 * Any WebView message whose posting-frame URL does not match one of these
 * origins is ignored, even if its body happens to parse as a Coinbase
 * event shape.
 */
export const COINBASE_CHECKOUT_ORIGINS = ['https://pay.coinbase.com'];

/**
 * Checks whether a WebView message's posting-frame URL belongs to a
 * trusted Coinbase checkout origin.
 *
 * @param url - The `event.nativeEvent.url` of the WebView message, if any.
 * @returns True when the URL parses and its origin is in
 * `COINBASE_CHECKOUT_ORIGINS`.
 */
export function isCoinbaseCheckoutUrl(url: string | undefined): boolean {
  if (!url) return false;

  try {
    return COINBASE_CHECKOUT_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

/**
 * A parsed Coinbase embedded checkout page event, with the
 * `onramp_api.` prefix stripped from the event name.
 */
export interface CoinbaseCheckoutEvent {
  eventName: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Parses a WebView message body as a Coinbase embedded checkout page event.
 * Coinbase posts `event.nativeEvent.data` as a JSON string
 * `{ eventName, data?: { errorCode, errorMessage } }` from the top frame.
 * Any other message shape (e.g. `{ type: 'IFRAME_DETECTED' }`) is ignored.
 *
 * @param data - The raw WebView message body to parse.
 * @returns The parsed event, or undefined when the body is not a Coinbase
 * checkout event.
 */
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
