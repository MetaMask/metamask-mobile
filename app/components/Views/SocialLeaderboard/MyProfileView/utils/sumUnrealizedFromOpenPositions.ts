import type { Position } from '@metamask/social-controllers';
import { isUncountedPosition } from './partitionUncountedPositions';

/**
 * Live unrealized P&L across open positions already returned by the v2
 * open-positions query (`pnlValueUsd` is realized + unrealized).
 *
 * Flagged (insider / developer / unsupported) rows are excluded. Positions
 * missing a finite `pnlValueUsd` or `realizedPnl` are skipped. Returns `null`
 * when nothing in the list can be priced, so the UI can leave the cell empty
 * instead of inventing `$0`.
 */
export const sumUnrealizedFromOpenPositions = (
  positions: readonly Position[] | null | undefined,
): number | null => {
  let sum = 0;
  let hasPriced = false;

  for (const position of positions ?? []) {
    if (isUncountedPosition(position)) {
      continue;
    }

    const { pnlValueUsd, realizedPnl } = position;
    if (
      pnlValueUsd == null ||
      realizedPnl == null ||
      !Number.isFinite(pnlValueUsd) ||
      !Number.isFinite(realizedPnl)
    ) {
      continue;
    }

    hasPriced = true;
    sum += pnlValueUsd - realizedPnl;
  }

  return hasPriced ? sum : null;
};
