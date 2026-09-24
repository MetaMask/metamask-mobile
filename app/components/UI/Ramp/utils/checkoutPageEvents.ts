import { coinbaseCheckoutPageEventAdapter } from './coinbaseEmbedded';

/** Provider-neutral vocabulary each adapter maps its page events onto. */
export type CheckoutPageEventKind =
  | 'loaded'
  | 'load_failed'
  | 'payment_started'
  | 'committed'
  | 'completed'
  | 'payment_failed'
  | 'cancelled'
  | 'limit_reached'
  | 'failed'
  | 'tracked_only';

export type CheckoutLoadFailureReason = 'link_expired';

export interface CheckoutPageEvent {
  kind: CheckoutPageEventKind;
  name: string;
  errorCode?: string;
  reason?: CheckoutLoadFailureReason;
}

/** How a provider's embedded checkout page talks to the Checkout WebView. */
export interface CheckoutPageEventAdapter {
  /** Whether the message's posting-frame URL is a trusted origin for this provider. */
  isTrustedUrl: (url: string | undefined) => boolean;
  parse: (data: unknown) => CheckoutPageEvent | undefined;
  /** The page goes silent when Google Pay can't pay, so Android must ask Play Services first. */
  requiresGooglePayPreflight?: boolean;
}

export interface ProviderCheckoutPageEventAdapter
  extends CheckoutPageEventAdapter {
  matches: (providerId: string) => boolean;
}

const ADAPTERS: readonly ProviderCheckoutPageEventAdapter[] = [
  coinbaseCheckoutPageEventAdapter,
];

/** Undefined for providers whose checkout only talks through callback-URL navigation. */
export function getCheckoutPageEventAdapter(
  providerId: string | undefined,
): CheckoutPageEventAdapter | undefined {
  if (!providerId) return undefined;

  return ADAPTERS.find((adapter) => adapter.matches(providerId));
}
