/**
 * Share of market cap below which the pool is too thin for holders to exit at
 * the price on screen, so Liq/MC renders in amber.
 *
 * Published bands agree closely: above 20% is a deep, mature market, 5–20% is
 * healthy for an established memecoin, 1–5% is thin enough that large trades
 * move the price, and under 1% means the valuation is mostly paper. Rug-check
 * checklists gate on the same 5%, and the strictest screener in circulation
 * uses 3% while noting most legitimate memecoins sit between 3% and 10%.
 *
 * ASSETS-4019 asks for a single amber state rather than severity bands, so this
 * takes the widely cited 5% rather than the stricter 3%: it catches the whole
 * thin band instead of only the worst of it.
 *
 * @see https://dexpaprika.com/glossary/liquidity
 */
export const LOW_LIQUIDITY_TO_MARKET_CAP_RATIO = 0.05;

/**
 * Liquidity as a share of market cap, or `null` when the inputs cannot produce
 * a meaningful ratio.
 */
export const getLiquidityToMarketCapRatio = (
  liquidity: number | null | undefined,
  marketCap: number | null | undefined,
): number | null => {
  if (liquidity == null || marketCap == null) {
    return null;
  }

  if (!Number.isFinite(liquidity) || !Number.isFinite(marketCap)) {
    return null;
  }

  // A zero or negative valuation makes the ratio meaningless rather than large.
  if (marketCap <= 0 || liquidity < 0) {
    return null;
  }

  return liquidity / marketCap;
};

/**
 * Whether a ratio is thin enough to warrant the amber value.
 *
 * An unknown ratio is not low: ASSETS-4019 requires a missing value to render
 * the gray dash, so absent data must never read as a warning.
 */
export const isLowLiquidityToMarketCapRatio = (
  ratio: number | null | undefined,
): boolean => ratio != null && ratio < LOW_LIQUIDITY_TO_MARKET_CAP_RATIO;
