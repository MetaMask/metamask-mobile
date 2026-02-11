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
 * Prefers provider metadata (providerInfo.type); falls back to provider ID
 * suffix only when metadata is missing, so native providers with non-standard
 * IDs are still detected when the API sends type.
 *
 * @param quote - The quote to check.
 * @returns True if the provider is native/whitelabel.
 */
export function isNativeProvider(quote: Quote): boolean {
  if (quote.providerInfo?.type !== undefined) {
    return quote.providerInfo.type === 'native';
  }
  const providerId =
    typeof quote.provider === 'string'
      ? quote.provider
      : ((quote.provider as { id?: string })?.id ?? '');
  return typeof providerId === 'string' && providerId.endsWith('-native');
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
