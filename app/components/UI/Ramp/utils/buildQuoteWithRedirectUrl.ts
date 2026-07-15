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

function getProviderDeeplinkRedirectUrl(providerCode: string): string {
  return `metamask://on-ramp/providers/${providerCode}`;
}

/**
 * Returns redirect config for aggregator flow: deeplink when quote indicates
 * external browser, callbackBaseUrl for Checkout WebView.
 */
export function getAggregatorRedirectConfig(
  quote: Quote,
  providerCode: string,
): { useExternalBrowser: boolean; redirectUrl: string } {
  const useExternalBrowser =
    quote.quote?.buyWidget?.browser === 'IN_APP_OS_BROWSER';
  return {
    useExternalBrowser,
    redirectUrl: useExternalBrowser
      ? getProviderDeeplinkRedirectUrl(providerCode)
      : getRampCallbackBaseUrl(),
  };
}

/**
 * Returns redirect config for widget providers (custom actions or aggregators).
 * Unifies the logic so redirectUrl and useExternalBrowser come from one place.
 */
export function getWidgetRedirectConfig(
  quote: Quote,
  providerCode: string,
  isCustom: boolean,
): { useExternalBrowser: boolean; redirectUrl: string } {
  if (isCustom) {
    return {
      useExternalBrowser: true,
      redirectUrl: getProviderDeeplinkRedirectUrl(providerCode),
    };
  }
  return getAggregatorRedirectConfig(quote, providerCode);
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
