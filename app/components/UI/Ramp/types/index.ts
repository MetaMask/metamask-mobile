import type { Quote } from '@metamask/ramps-controller';

export interface RampIntent {
  assetId?: string;
  amount?: string;
  currency?: string;
}

/**
 * Extracts the widget URL from a quote.
 * Uses the url field from the quote object.
 *
 * @param quote - The quote to extract the widget URL from.
 * @returns The widget URL string, or null if not available.
 */
export function getQuoteWidgetUrl(quote: Quote): string | null {
  if (quote.url && typeof quote.url === 'string' && quote.url.length > 0) {
    return quote.url;
  }
  return null;
}

/**
 * Checks if a quote is from a native/whitelabel provider.
 *
 * @param quote - The quote to check.
 * @returns True if the provider is native/whitelabel.
 */
export function isNativeProvider(quote: Quote): boolean {
  return quote.providerInfo?.type === 'native';
}

/**
 * Gets the provider name from a quote's providerInfo.
 * Falls back to the provider ID if name is not available.
 *
 * @param quote - The quote to extract the provider name from.
 * @returns The provider name.
 */
export function getQuoteProviderName(quote: Quote): string {
  return quote.providerInfo?.name ?? quote.provider;
}
