import { BigNumber } from 'bignumber.js';
import type { OndoGmPortfolioPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

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

/**
 * Formats a PnL percent string (e.g. "0.0775") as "+7.75%" / "-5.00%".
 * Returns '' for non-parseable values (e.g. "—").
 */
export function formatPnlPercent(pnlPercent: string): string {
  try {
    const n = new BigNumber(pnlPercent);
    if (n.isNaN()) return '';
    const percentage = n.multipliedBy(100);
    const sign = percentage.gte(0) ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  } catch {
    return '';
  }
}

/**
 * Returns true if the given PnL percent string represents a non-negative value.
 */
export function isPnlNonNegative(pnlPercent: string): boolean {
  try {
    return new BigNumber(pnlPercent).gte(0);
  } catch {
    return false;
  }
}
