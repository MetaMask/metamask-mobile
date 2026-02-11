import type { Quote } from '@metamask/ramps-controller';

export interface RampIntent {
  assetId?: string;
  amount?: string;
  currency?: string;
}

/**
 * Checks if a quote is from a native/whitelabel provider.
 * Native providers have specific provider IDs ending in "-native".
 *
 * @param quote - The quote to check.
 * @returns True if the provider is native/whitelabel.
 */
export function isNativeProvider(quote: Quote): boolean {
  // Check if provider ID ends with "-native" (e.g., "/providers/transak-native")
  return quote.provider.endsWith('-native');
}

/**
 * Gets the provider name from a quote's provider ID.
 * Extracts the provider name from the provider path (e.g., "/providers/moonpay" -> "Moonpay").
 *
 * @param quote - The quote to extract the provider name from.
 * @returns The provider name with capitalized first letter.
 */
export function getQuoteProviderName(quote: Quote): string {
  // Extract provider name from path (e.g., "/providers/moonpay" -> "moonpay")
  const providerPath = quote.provider;
  const providerName = providerPath.split('/').pop() || providerPath;

  // Remove "-native" suffix if present and capitalize first letter
  const cleanName = providerName.replace(/-native$/, '');
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}
