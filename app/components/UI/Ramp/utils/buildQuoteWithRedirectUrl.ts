import { isExternalBrowserQuote, type Quote } from '@metamask/ramps-controller';
import { getRampCallbackBaseUrl } from './getRampCallbackBaseUrl';

/** True system open — partner universal links can fire (e.g. Revolut native). */
export const EXTERNAL_OS_BROWSER = 'EXTERNAL_OS_BROWSER' as const;

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

function getQuoteBrowser(quote: Quote): string | null | undefined {
  return quote.quote?.buyWidget?.browser;
}

/**
 * Whether MetaMask should leave the in-app WebView for this quote.
 * Includes API `EXTERNAL_OS_BROWSER` (not yet in published isExternalBrowserQuote).
 */
export function shouldUseExternalBrowser(quote: Quote): boolean {
  return (
    isExternalBrowserQuote(quote) ||
    getQuoteBrowser(quote) === EXTERNAL_OS_BROWSER
  );
}

/**
 * Whether iOS should use Linking.openURL instead of ASWebAuthenticationSession.
 * Required for partner universal links (e.g. Revolut /app/onramp).
 */
export function shouldUseSystemOpen(quote: Quote): boolean {
  return getQuoteBrowser(quote) === EXTERNAL_OS_BROWSER;
}

/**
 * Returns redirect config for aggregator flow: deeplink when quote indicates
 * external browser, callbackBaseUrl for Checkout WebView.
 *
 * The in-app-vs-external classification comes from `RampsController`'s shared
 * `isExternalBrowserQuote` helper; only the mobile-specific redirect URL /
 * deeplink scheme is decided here.
 */
export function getAggregatorRedirectConfig(
  quote: Quote,
  providerCode: string,
): { useExternalBrowser: boolean; redirectUrl: string } {
  const useExternalBrowser = shouldUseExternalBrowser(quote);
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
