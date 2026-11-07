import type { Position } from '@metamask/social-controllers';
import { buildLivePriceSource } from '../../../../UI/SocialFeed/live/buildLivePriceSource';
import { computeLivePositionFigures } from '../../../../UI/SocialFeed/live/computeLivePositionFigures';
import type {
  SocialLivePriceKey,
  SocialLivePriceSource,
} from '../../../../UI/SocialFeed/live/types';
import {
  deriveAverageEntryPrice,
  deriveCurrentPrice,
} from '../../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import { isUncountedPosition } from './partitionUncountedPositions';

/** An open position the Unrealized cell counts, and how it follows a price. */
export interface LiveUnrealizedEntry {
  position: Position;
  /** Absent when no stream can price the asset: it keeps its snapshot. */
  source?: SocialLivePriceSource;
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/**
 * The open positions that feed the Unrealized cell: the same rows
 * `sumUnrealizedFromOpenPositions` counts, each with its live price source.
 */
export const buildLiveUnrealizedEntries = (
  positions: readonly Position[] | null | undefined,
): LiveUnrealizedEntry[] =>
  (positions ?? []).flatMap((position) => {
    if (
      isUncountedPosition(position) ||
      !isFiniteNumber(position.pnlValueUsd) ||
      !isFiniteNumber(position.realizedPnl)
    ) {
      return [];
    }
    const source = buildLivePriceSource(position, false, {
      snapshotPrice: deriveCurrentPrice(position),
      entryPrice: deriveAverageEntryPrice(position),
      marketCapPerPrice: null,
    });
    return [{ position, source }];
  });

/**
 * Unrealized P&L across the entries, with every position that has a streamed
 * price re-derived at it and the rest left at the API's figure. `null` when
 * nothing can be priced.
 */
export const sumLiveUnrealizedPnl = (
  entries: readonly LiveUnrealizedEntry[],
  getPrice: (key: SocialLivePriceKey) => number | undefined,
): number | null => {
  if (entries.length === 0) {
    return null;
  }
  let sum = 0;
  for (const { position, source } of entries) {
    const realized = position.realizedPnl ?? 0;
    const snapshotTotal = position.pnlValueUsd ?? realized;
    const price = source ? getPrice(source.key) : undefined;
    const liveTotal =
      source && price !== undefined
        ? computeLivePositionFigures(source, price).pnlUsd
        : null;
    sum += (liveTotal ?? snapshotTotal) - realized;
  }
  return sum;
};
