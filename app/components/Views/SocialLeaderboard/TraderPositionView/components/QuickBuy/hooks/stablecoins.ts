/**
 * Stablecoin symbols a user can receive when selling a position.
 *
 * Used to curate the QuickBuy "Receive" candidate set from the broader
 * `DefaultSwapDestTokens` list. Matching is case-insensitive so the source
 * token definitions are handled regardless of their symbol casing.
 */
const STABLECOIN_SYMBOLS = new Set(['musd', 'usdc', 'usdt']);

export const isStablecoinSymbol = (symbol: string | undefined): boolean =>
  symbol !== undefined && STABLECOIN_SYMBOLS.has(symbol.toLowerCase());
