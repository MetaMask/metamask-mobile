/**
 * Stablecoin symbols treated as ~$1.00 when no live market price is available.
 *
 * This gates the QuickBuy $1 fallback exchange rate: a held stable can still
 * surface during a brief price-data gap, while a non-stable with no resolvable
 * price (e.g. CAKE) is dropped instead of mispriced at a fake $1/token rate.
 * Matching is case-insensitive so arbitrary held-token lists are handled.
 */
const STABLECOIN_SYMBOLS = new Set(['musd', 'usdc', 'usdt']);

export const isStablecoinSymbol = (symbol: string | undefined): boolean =>
  symbol !== undefined && STABLECOIN_SYMBOLS.has(symbol.toLowerCase());
