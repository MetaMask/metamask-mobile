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
 * Uses the provider metadata type field to determine if it's a native provider.
 *
 * @param quote - The quote to check.
 * @returns True if the provider is native/whitelabel.
 */
export function isNativeProvider(quote: Quote): boolean {
  return quote.providerInfo?.type === 'native';
}

/**
 * Gets the provider name from a quote's provider metadata.
 * Uses the canonical provider name from providerInfo.
 *
 * @param quote - The quote to extract the provider name from.
 * @returns The canonical provider display name.
 */
export function getQuoteProviderName(quote: Quote): string {
  return quote.providerInfo?.name || 'Provider';
}
