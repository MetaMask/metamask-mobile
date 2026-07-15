import { isExternalBrowserQuote, type Quote } from '@metamask/ramps-controller';
import type { Theme } from '../../../../util/theme/models';
import { isPureBlackEnabled } from '../../../../util/theme/themeUtils';
import { generateThemeParameters } from './depositUtils';
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
 * Appends Transak widget theme query params to a buy URL when pure black is
 * enabled so provider-hosted checkout surfaces match the elevated BottomSheet.
 */
export function appendWidgetThemeToBuyUrl(
  buyURL: string,
  theme: Theme,
): string {
  if (!isPureBlackEnabled) {
    return buyURL;
  }

  const buyUrl = new URL(buyURL);
  const themeParams = generateThemeParameters(
    theme.themeAppearance,
    theme.colors,
  );

  Object.entries(themeParams).forEach(([key, value]) => {
    buyUrl.searchParams.set(key, value);
  });

  return buyUrl.toString();
}

/**
 * Rewrites a quote's buy URL with redirect + optional pure-black widget theme.
 */
export function buildQuoteWithWidgetTheme(
  quote: Quote,
  redirectUrl: string,
  theme: Theme,
): Quote {
  const quoteWithRedirect = buildQuoteWithRedirectUrl(quote, redirectUrl);
  const buyURL = quoteWithRedirect.quote?.buyURL;
  if (!buyURL) {
    return quoteWithRedirect;
  }

  return {
    ...quoteWithRedirect,
    quote: {
      ...quoteWithRedirect.quote,
      buyURL: appendWidgetThemeToBuyUrl(buyURL, theme),
    },
  };
}

function getProviderDeeplinkRedirectUrl(providerCode: string): string {
  return `metamask://on-ramp/providers/${providerCode}`;
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
  const useExternalBrowser = isExternalBrowserQuote(quote);
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
