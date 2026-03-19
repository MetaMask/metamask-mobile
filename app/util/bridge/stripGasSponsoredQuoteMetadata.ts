import type {
  Quote,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';

/**
 * Quote row from BridgeController / `selectBridgeQuotes` (metadata + API response).
 */
export type QuoteMetadataWithResponse = QuoteMetadata & QuoteResponse;

/**
 * Clears gas-sponsored flags on the nested {@link Quote} for UI and downstream
 * consumers that read `useBridgeQuoteData` output.
 *
 * Used when the source account cannot use in-wallet gasless / 7702 flows (e.g.
 * hardware / QR) so fee rows, banners, and `isGaslessQuote` stay consistent
 * even if the bridge API still returns legacy `gasIncluded` / `gasSponsored`
 * fields alongside `gasIncluded7702: false` on the request.
 */
export function stripGasSponsoredFromQuoteMetadata(
  item: QuoteMetadataWithResponse,
): QuoteMetadataWithResponse {
  const { quote, ...rest } = item;
  const clearedQuote: Quote = {
    ...quote,
    gasIncluded: false,
    gasIncluded7702: false,
    gasSponsored: false,
  };
  return {
    ...rest,
    quote: clearedQuote,
  } as QuoteMetadataWithResponse;
}
