import type { SocialLivePositionFigures, SocialLivePriceSource } from './types';

/**
 * Re-derives an open position's P&L and market cap at a live price.
 *
 * P&L moves from the API's own figure by the price change since its snapshot,
 * so fees and partial exits the API already folded in are kept. Without a
 * snapshot it falls back to the move from the average entry.
 */
export function computeLivePositionFigures(
  source: SocialLivePriceSource,
  price: number,
): SocialLivePositionFigures {
  const { positionAmount, direction, snapshotPrice, snapshotPnlUsd } = source;

  let pnlUsd: number | null = null;
  if (snapshotPrice != null && snapshotPnlUsd != null) {
    pnlUsd =
      snapshotPnlUsd + direction * positionAmount * (price - snapshotPrice);
  } else if (source.entryPrice != null) {
    pnlUsd = direction * positionAmount * (price - source.entryPrice);
  }

  const pnlPercent =
    pnlUsd != null && source.pnlBaseUsd != null && source.pnlBaseUsd > 0
      ? (pnlUsd / source.pnlBaseUsd) * 100
      : null;

  return {
    price,
    pnlUsd,
    pnlPercent,
    marketCapUsd:
      source.marketCapPerPrice == null
        ? null
        : source.marketCapPerPrice * price,
  };
}
