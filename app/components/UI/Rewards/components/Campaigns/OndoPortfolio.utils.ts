import { BigNumber } from 'bignumber.js';
import type { OndoGmPortfolioPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

// Re-export shared helpers so existing consumers keep working
export {
  formatPercentChange as formatPnlPercent,
  isPercentChangeNonNegative as isPnlNonNegative,
  getChainHex,
  shortenAddress,
  getAssetReference,
} from '../../utils/formatUtils';

/**
 * Merges positions that share the same CAIP-19 `tokenAsset` by summing numeric fields.
 * Recomputes average cost per unit and unrealized PnL percent from merged totals when possible.
 */
export function groupPortfolioPositionsByAsset(
  positions: OndoGmPortfolioPositionDto[],
): OndoGmPortfolioPositionDto[] {
  const map = new Map<string, OndoGmPortfolioPositionDto>();

  for (const p of positions) {
    const existing = map.get(p.tokenAsset);
    if (!existing) {
      map.set(p.tokenAsset, { ...p });
      continue;
    }

    const units = new BigNumber(existing.units).plus(p.units);
    const costBasis = new BigNumber(existing.costBasis).plus(p.costBasis);
    const currentValue = new BigNumber(existing.currentValue).plus(
      p.currentValue,
    );
    const unrealizedPnl = new BigNumber(existing.unrealizedPnl).plus(
      p.unrealizedPnl,
    );

    const avgCostPerUnit = units.gt(0) ? costBasis.div(units).toFixed(6) : '—';

    const unrealizedPnlPercent = costBasis.gt(0)
      ? unrealizedPnl.div(costBasis).toFixed(6)
      : '—';

    const currentPrice = units.gt(0)
      ? currentValue.div(units).toFixed(6)
      : p.currentPrice;

    map.set(p.tokenAsset, {
      tokenSymbol: existing.tokenSymbol,
      tokenName: existing.tokenName,
      tokenAsset: existing.tokenAsset,
      units: units.toFixed(),
      costBasis: costBasis.toFixed(6),
      avgCostPerUnit,
      currentPrice,
      currentValue: currentValue.toFixed(6),
      unrealizedPnl: unrealizedPnl.toFixed(6),
      unrealizedPnlPercent,
    });
  }

  return Array.from(map.values());
}
