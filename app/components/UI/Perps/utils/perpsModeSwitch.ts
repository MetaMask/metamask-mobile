import type { PerpsMarketData } from '@metamask/perps-controller';

/**
 * Default market a user lands on when switching to Pro mode (TAT-3551, AC #4).
 */
export const PERPS_DEFAULT_PRO_MARKET_SYMBOL = 'BTC';

/**
 * Builds the minimal market payload used to navigate to the default Pro market.
 *
 * Only the symbol is known at the call site; the market detail view enriches
 * the remaining fields from the live markets stream, so a symbol-only payload
 * is sufficient to open `MARKET_DETAILS`.
 */
export const buildDefaultProMarket = (): PerpsMarketData =>
  ({
    symbol: PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  }) as unknown as PerpsMarketData;
