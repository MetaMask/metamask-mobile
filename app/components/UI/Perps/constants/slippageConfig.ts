/**
 * Slippage configuration constants for the perps order entry surface.
 * All values in basis points (1 bps = 0.01%).
 * Default 300 bps (3%) matches HyperLiquid's DefaultMarketSlippageBps.
 * Range 10–1000 bps (0.1%–10%) in 10 bps (0.1%) steps.
 */
export const PERPS_SLIPPAGE_DEFAULT_BPS = 300;
export const PERPS_SLIPPAGE_MIN_BPS = 10;
export const PERPS_SLIPPAGE_MAX_BPS = 1000;
export const PERPS_SLIPPAGE_STEP_BPS = 10;

/** Quick-pick presets in basis points */
export const PERPS_SLIPPAGE_QUICK_PICKS_BPS = [50, 100, 300, 500];

/** Convert bps to percent for display */
export const bpsToPercent = (bps: number): number => bps / 100;

/** Convert percent to bps for storage */
export const percentToBps = (pct: number): number => Math.round(pct * 100);
