import type { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';

type Quote = QuoteResponse & QuoteMetadata;

/**
 * Determines whether a freshly fetched quote is safe to use as a silent
 * replacement for a previously cached quote during a retry.
 *
 * Safety criteria:
 *  - The source and destination chains/assets must match the original quote
 *    (defensive: guards against the route changing under us).
 *  - The new quote's minimum receive (minDestTokenAmount) must be greater
 *    than or equal to the original's. This is the slippage-protected floor
 *    encoded into the swap calldata; equal-or-better means the user is
 *    getting at least the terms they originally approved.
 */
export function isRetryQuoteAcceptable(
  cached: Quote,
  fresh: Quote,
): boolean {
  const cachedQuote = cached.quote;
  const freshQuote = fresh.quote;

  if (cachedQuote.srcChainId !== freshQuote.srcChainId) return false;
  if (cachedQuote.destChainId !== freshQuote.destChainId) return false;

  const cachedSrc = cachedQuote.srcAsset.address.toLowerCase();
  const freshSrc = freshQuote.srcAsset.address.toLowerCase();
  if (cachedSrc !== freshSrc) return false;

  const cachedDest = cachedQuote.destAsset.address.toLowerCase();
  const freshDest = freshQuote.destAsset.address.toLowerCase();
  if (cachedDest !== freshDest) return false;

  try {
    return (
      BigInt(freshQuote.minDestTokenAmount) >=
      BigInt(cachedQuote.minDestTokenAmount)
    );
  } catch {
    return false;
  }
}
