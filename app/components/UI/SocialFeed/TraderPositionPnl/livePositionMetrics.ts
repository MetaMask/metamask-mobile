import { tradeTimestampToMs } from '../utils/tradeTimestamp';

export interface LivePositionMetricsInput {
  /** Current token price in USD. */
  livePriceUsd: number | null | undefined;
  /** Token balance held by the user. */
  tokensHeld: number | null | undefined;
  /** Cost basis in USD. */
  costBasisUsd: number | null | undefined;
  /** Earliest buy timestamp from the position API. */
  earliestBuyTime: number | null | undefined;
  isOpen: boolean;
}

export interface LivePositionMetrics {
  positionValueUsd: number | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPercent: number | null;
  averageCostUsd: number | null;
  holdTimeMs: number | null;
}

const isFiniteNonNegative = (
  value: number | null | undefined,
): value is number => value != null && Number.isFinite(value) && value >= 0;

const computeHoldTimeMs = (
  earliestBuyTime: number | null | undefined,
  nowMs: number,
): number | null => {
  if (
    earliestBuyTime == null ||
    !Number.isFinite(earliestBuyTime) ||
    !Number.isFinite(nowMs) ||
    earliestBuyTime <= 0
  ) {
    return null;
  }

  return Math.max(0, nowMs - tradeTimestampToMs(earliestBuyTime));
};

/**
 * Derives position metrics from one live USD price snapshot.
 *
 * A closed position has no remaining exposure, so its value and unrealized
 * PnL are zero. A zero token balance remains calculable for PnL, but has no
 * average cost because dividing by zero is undefined.
 */
export const computeLivePositionMetrics = (
  input: LivePositionMetricsInput,
  nowMs: number = Date.now(),
): LivePositionMetrics => {
  const holdTimeMs = computeHoldTimeMs(input.earliestBuyTime, nowMs);

  if (!input.isOpen) {
    return {
      positionValueUsd: 0,
      unrealizedPnlUsd: 0,
      unrealizedPnlPercent: null,
      averageCostUsd: null,
      holdTimeMs,
    };
  }

  const positionValueUsd =
    isFiniteNonNegative(input.livePriceUsd) &&
    isFiniteNonNegative(input.tokensHeld)
      ? input.livePriceUsd * input.tokensHeld
      : null;
  const costBasisUsd = isFiniteNonNegative(input.costBasisUsd)
    ? input.costBasisUsd
    : null;
  const unrealizedPnlUsd =
    positionValueUsd != null && costBasisUsd != null
      ? positionValueUsd - costBasisUsd
      : null;

  return {
    positionValueUsd,
    unrealizedPnlUsd,
    unrealizedPnlPercent:
      unrealizedPnlUsd != null && costBasisUsd != null && costBasisUsd > 0
        ? (unrealizedPnlUsd / costBasisUsd) * 100
        : null,
    averageCostUsd:
      costBasisUsd != null &&
      input.tokensHeld != null &&
      Number.isFinite(input.tokensHeld) &&
      input.tokensHeld > 0
        ? costBasisUsd / input.tokensHeld
        : null,
    holdTimeMs,
  };
};
