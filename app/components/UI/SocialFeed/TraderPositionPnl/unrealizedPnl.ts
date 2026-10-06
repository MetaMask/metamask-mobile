import type { TraderPosition, UnrealizedPnl } from './types';

const EMPTY_PNL: UnrealizedPnl = { usd: null, percent: null };

/**
 * Perps formula is unconfirmed (cost basis vs leveraged cost basis, short
 * sign, percent base). Return null until the Social API team confirms it.
 */
const isPerpPosition = (position: TraderPosition): boolean =>
  position.perpPositionType != null || position.perpLeverage != null;

/**
 * Spot unrealized PnL.
 *
 * `unrealizedPnlUsd = currentValueUSD - costBasis`
 * `percent = costBasis > 0 ? unrealizedPnlUsd / costBasis * 100 : null`
 *
 * A closed position has no remaining exposure, so unrealized USD is 0.
 * API `pnlPercent` is total PnL over `boughtUsd`, so this percent is computed
 * here rather than read from the payload.
 */
export const computeUnrealizedPnl = (
  position: TraderPosition,
): UnrealizedPnl => {
  if (isPerpPosition(position)) {
    return EMPTY_PNL;
  }

  if (!position.isOpen) {
    return { usd: 0, percent: null };
  }

  if (position.currentValueUSD == null) {
    return EMPTY_PNL;
  }

  const usd = position.currentValueUSD - position.costBasis;
  const percent =
    position.costBasis > 0 ? (usd / position.costBasis) * 100 : null;

  return { usd, percent };
};
