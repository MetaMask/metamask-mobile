import type { Quote as BaseQuote } from '@metamask/ramps-controller';

export interface RampIntent {
  assetId?: string;
  amount?: string;
  currency?: string;
}

/**
 * Provider information metadata included in quotes.
 */
export interface ProviderInfo {
  id: string;
  name: string;
  type: 'native' | 'aggregator';
}

/**
 * Extended Quote type that includes provider metadata.
 * This extends the base Quote type from @metamask/ramps-controller
 * to include runtime fields that may not be in the published type definition.
 */
export interface Quote extends BaseQuote {
  providerInfo?: ProviderInfo;
}

/**
 * Checks if a quote is from a native/whitelabel provider.
 *
 * @param quote - The quote to check.
 * @returns True if the provider is native/whitelabel, false otherwise.
 */
export function isNativeProvider(quote: Quote): boolean {
  return quote.providerInfo?.type === 'native';
}

/**
 * Gets the display name for the quote's provider.
 * Uses only quote.providerInfo.name so Checkout and other UI show correct
 * branding. Never derives a label from quote.provider (the path/slug), since
 * that can differ from the canonical display name (e.g. "Ramp Network" vs
 * "ramp-network").
 *
 * @param quote - The quote to extract the provider name from.
 * @returns The canonical provider display name, or 'Provider' if missing.
 */
export function getQuoteProviderName(quote: Quote): string {
  return quote.providerInfo?.name || 'Provider';
}

/**
 * Provider info shape that may include API-only fields (e.g. features.buy.userAgent).
 * Used for reading optional fields from quote.providerInfo at runtime.
 */
interface ProviderInfoWithFeatures {
  features?: {
    buy?: {
      userAgent?: string | null;
    };
  };
}

/**
 * Gets the provider-specific userAgent for the buy WebView when present.
 * Some providers require a custom userAgent (features.buy.userAgent) to load
 * or behave correctly in the checkout WebView.
 *
 * @param quote - The quote that may include providerInfo.features.buy.userAgent.
 * @returns The userAgent string to pass to the WebView, or undefined if not set.
 */
export function getQuoteBuyUserAgent(quote: Quote): string | undefined {
  const providerInfo = quote.providerInfo as
    | ProviderInfoWithFeatures
    | undefined;
  const userAgent = providerInfo?.features?.buy?.userAgent;
  return userAgent == null || userAgent === '' ? undefined : userAgent;
}
