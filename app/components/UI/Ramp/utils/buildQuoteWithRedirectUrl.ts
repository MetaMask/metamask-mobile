import type { Quote } from '@metamask/ramps-controller';
import { getRampCallbackBaseUrl } from './getRampCallbackBaseUrl';

/**
 * Returns a quote with buyURL rewritten to use the given redirect URL.
 * Ideally this logic would live in the API or controller — the client
 * shouldn't need to rewrite URLs before fetching. Kept here until then.
 */
export function buildQuoteWithRedirectUrl(
  quote: Quote,
  redirectUrl: string,
): Quote {
  const buyURL = quote.quote?.buyURL;
  if (!buyURL) return quote;

  const buyUrl = new URL(buyURL);
  buyUrl.searchParams.set('redirectUrl', redirectUrl);
  return {
    ...quote,
    quote: {
      ...quote.quote,
      buyURL: buyUrl.toString(),
    },
  };
}

/**
 * Returns redirect URL for aggregator flow: deeplink when quote indicates
 * external browser, callbackBaseUrl for Checkout WebView.
 */
export function getAggregatorRedirectUrl(
  quote: Quote,
  providerCode: string,
): string {
  const useExternalBrowser =
    quote.quote?.buyWidget?.browser === 'IN_APP_OS_BROWSER';
  return useExternalBrowser
    ? `metamask://on-ramp/providers/${providerCode}`
    : getRampCallbackBaseUrl();
}

export function getCheckoutContext(
  selectedToken: { chainId?: string } | null,
  walletAddress: string | null | undefined,
  rawOrderId?: string | null | undefined,
): {
  network: string;
  effectiveWallet: string;
  effectiveOrderId: string | null;
} {
  const chainId = selectedToken?.chainId;
  const network = chainId?.includes(':')
    ? chainId.split(':')[1] || ''
    : chainId || '';
  return {
    network,
    effectiveWallet: walletAddress ?? '',
    effectiveOrderId: rawOrderId?.trim() || null,
  };
}
