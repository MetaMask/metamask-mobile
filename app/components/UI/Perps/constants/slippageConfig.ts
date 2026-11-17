import {
  MAX_SLIPPAGE_BOUNDS,
  ORDER_SLIPPAGE_CONFIG,
  PERPS_EVENT_VALUE,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  type OrderType,
} from '@metamask/perps-controller';

/**
 * Slippage configuration constants for the perps order entry surface.
 * All values in basis points (1 bps = 0.01%).
 * Range 10–1000 bps (0.1%–10%) in 10 bps (0.1%) steps.
 */
export const PERPS_SLIPPAGE_DEFAULT_BPS =
  ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps;
export const PERPS_TRIGGER_MARKET_DEFAULT_BPS =
  ORDER_SLIPPAGE_CONFIG.DefaultTpslSlippageBps;
export const PERPS_SLIPPAGE_MIN_BPS = MAX_SLIPPAGE_BOUNDS.MinBps;
export const PERPS_SLIPPAGE_MAX_BPS = MAX_SLIPPAGE_BOUNDS.MaxBps;
export const PERPS_SLIPPAGE_STEP_BPS = MAX_SLIPPAGE_BOUNDS.StepBps;

/** Quick-pick presets in basis points (0.5%, 2%, 3%) */
export const PERPS_SLIPPAGE_QUICK_PICKS_BPS = [50, 200, 300];

export type MaxSlippageSource =
  (typeof PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE)[keyof typeof PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE];

/** Convert bps to percent for display */
export const bpsToPercent = (bps: number): number => bps / 100;

/** Convert percent to bps for storage */
export const percentToBps = (pct: number): number => Math.round(pct * 100);

/**
 * Resolves max slippage from the order's placement/execution semantics.
 * A persisted user value wins; trigger-market orders otherwise use the
 * configured TP/SL default.
 *
 * @param input - Order type, resolved slippage, and source.
 * @returns The effective max slippage in basis points.
 */
export const resolvePerpsMaxSlippageBps = ({
  orderType,
  maxSlippageBps,
  maxSlippageSource,
}: {
  orderType: OrderType;
  maxSlippageBps: number;
  maxSlippageSource: MaxSlippageSource;
}): number =>
  isTriggerOrderType(orderType) &&
  !isLimitExecutionOrderType(orderType) &&
  maxSlippageSource === PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT
    ? PERPS_TRIGGER_MARKET_DEFAULT_BPS
    : maxSlippageBps;
