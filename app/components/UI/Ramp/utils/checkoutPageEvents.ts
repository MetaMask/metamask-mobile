import type { Quote } from '@metamask/ramps-controller';

import { coinbaseCheckoutPageEventAdapter } from './coinbaseEmbedded';

/** Hosted-widget fallback the API attaches to a quote; not yet in the published `BuyWidget` type. */
export interface BuyWidgetFallback {
  url: string;
  browser: 'IN_APP_OS_BROWSER' | 'APP_BROWSER';
}

interface BuyWidgetWithFallback {
  fallback?: BuyWidgetFallback;
}

export function getQuoteBuyWidgetFallback(
  quote: Quote,
): BuyWidgetFallback | undefined {
  const fallback = (quote.quote?.buyWidget as BuyWidgetWithFallback | undefined)
    ?.fallback;
  return fallback?.url ? fallback : undefined;
}

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
