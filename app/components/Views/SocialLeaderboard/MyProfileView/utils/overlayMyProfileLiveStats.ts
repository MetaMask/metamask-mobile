import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import {
  EM_DASH,
  formatPercent,
  formatSignedUsd,
  formatUsd,
} from '../../../../UI/SocialFeed/utils/formatters';
import {
  FAKE_STATS_PREFIX,
  formatSheetHoldFromMinutes,
  prefixFakeStat,
} from '../../TraderProfileView/components/statsSheetFormatters';
import type { MySocialProfile, ProfileRankingTag } from '../hooks/useMyProfile';
import { isUncountedPosition } from './partitionUncountedPositions';
import { sumUnrealizedFromOpenPositions } from './sumUnrealizedFromOpenPositions';

export { FAKE_STATS_PREFIX };

export type PerformanceCellId =
  | 'pnl'
  | 'unrealizedPnl'
  | 'winRate'
  | 'holdTime'
  | 'volume';

export interface PerformanceCell {
  id: PerformanceCellId;
  value: string;
  tone: 'default' | 'success' | 'error';
}

export interface OverlayedMyProfileStats {
  rankingTag: ProfileRankingTag | null | undefined;
  followerCount: number;
  winRateLabel: string;
  isWinRatePositive: boolean;
  pnlLabel: string;
  hasPnl: boolean;
  isPnlPositive: boolean;
  /**
   * Live Performance (30d) grid. Every stat is shown once a live profile
   * exists. A real zero stays zero. A missing number renders as an em dash.
   */
  performanceCells: PerformanceCell[];
}

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/** True when two-decimal USD would render as `$0.00`. */
const roundsToZeroCents = (value: number): boolean =>
  Math.round(value * 100) === 0;

/**
 * Signed USD for the compact header and the performance grid, always with
 * two fractional digits (`-$4.00`, `+$1,200.50`). A value that rounds to
 * zero cents stays unsigned.
 */
const formatPerformanceSignedUsd = (value: number): string =>
  roundsToZeroCents(value) ? formatUsd(0) : formatSignedUsd(value);

const signedUsdTone = (value: number): PerformanceCell['tone'] =>
  Math.round(value * 100) < 0 ? 'error' : 'success';

/** Hold label for an explicit zero median. Missing minutes stay an em dash. */
const ZERO_HOLD_LABEL = '0m';

const MISSING_CELL: Pick<PerformanceCell, 'value' | 'tone'> = {
  value: EM_DASH,
  tone: 'default',
};

/**
 * Hold label for the performance grid. A positive median keeps the compact
 * duration (`3h`, `1d 20h`). An explicit `0` reads as `0m`. A missing median
 * reads as an em dash.
 */
const formatPerformanceHold = (
  minutes: number | null | undefined,
): Pick<PerformanceCell, 'value' | 'tone'> => {
  if (!isPresentNumber(minutes)) {
    return MISSING_CELL;
  }
  if (minutes <= 0) {
    return { value: ZERO_HOLD_LABEL, tone: 'default' };
  }
  const label = formatSheetHoldFromMinutes(minutes);
  return label ? { value: label, tone: 'default' } : MISSING_CELL;
};

/**
 * Unrealized P&L for the grid.
 *
 * A priced sum, including `$0.00`, is shown as-is. No counted open positions
 * is a real zero. Counted positions that cannot be priced stay unknown.
 */
const unrealizedPerformance = (
  openPositions: readonly Position[],
): Pick<PerformanceCell, 'value' | 'tone'> => {
  const unrealized = sumUnrealizedFromOpenPositions(openPositions);
  const hasCountedOpen = openPositions.some(
    (position) => !isUncountedPosition(position),
  );
  if (unrealized == null && hasCountedOpen) {
    return MISSING_CELL;
  }

  const value = unrealized ?? 0;
  return {
    value: formatPerformanceSignedUsd(value),
    tone: roundsToZeroCents(value) ? 'default' : signedUsdTone(value),
  };
};

const signedUsdCell = (
  value: number | null | undefined,
): Pick<PerformanceCell, 'value' | 'tone'> =>
  isPresentNumber(value)
    ? {
        value: formatPerformanceSignedUsd(value),
        tone: signedUsdTone(value),
      }
    : MISSING_CELL;

const winRateCell = (
  winRate: number | null | undefined,
): Pick<PerformanceCell, 'value' | 'tone'> =>
  isPresentNumber(winRate)
    ? {
        value: formatPercent(winRate * 100, {
          showSign: false,
          decimals: 0,
        }),
        tone: 'default',
      }
    : MISSING_CELL;

const volumeCell = (
  volume: number | null | undefined,
): Pick<PerformanceCell, 'value' | 'tone'> =>
  isPresentNumber(volume)
    ? { value: formatUsd(Math.abs(volume)), tone: 'default' }
    : MISSING_CELL;

export const buildPerformanceCells = (
  live: TraderProfileResponse | null,
  openPositions: readonly Position[] = [],
): PerformanceCell[] => {
  const stats = live?.stats;
  if (!stats) {
    return [];
  }

  return [
    { id: 'pnl', ...signedUsdCell(stats.pnl30d) },
    { id: 'unrealizedPnl', ...unrealizedPerformance(openPositions) },
    { id: 'winRate', ...winRateCell(stats.winRate30d) },
    { id: 'holdTime', ...formatPerformanceHold(stats.medianHoldMinutes) },
    { id: 'volume', ...volumeCell(stats.volumeUsd30d) },
  ];
};

export const markFakeStat = (label: string): string =>
  prefixFakeStat(label, true);

const formatLocalWinRate = (
  winRatePercent: number | null | undefined,
): string =>
  winRatePercent != null
    ? formatPercent(winRatePercent, { showSign: false, decimals: 0 })
    : EM_DASH;

export const overlayMyProfileLiveStats = (
  local: MySocialProfile,
  live: TraderProfileResponse | null,
  openPositions: readonly Position[] = [],
): OverlayedMyProfileStats => {
  const liveWinRate = live?.stats.winRate30d;
  const livePnl = live?.stats.pnl30d;
  const hasLiveWinRate = isPresentNumber(liveWinRate);
  const hasLivePnl = isPresentNumber(livePnl);

  const winRateValue = hasLiveWinRate
    ? liveWinRate * 100
    : (local.winRatePercent ?? 0);
  const winRateRaw = hasLiveWinRate
    ? formatPercent(liveWinRate * 100, { showSign: false, decimals: 0 })
    : formatLocalWinRate(local.winRatePercent);
  const pnlValue = hasLivePnl ? livePnl : local.pnlUsd;
  const pnlRaw =
    pnlValue == null ? EM_DASH : formatPerformanceSignedUsd(pnlValue);

  return {
    rankingTag: (live?.rankingTag ?? local.rankingTag) as
      | ProfileRankingTag
      | null
      | undefined,
    followerCount: live ? live.followerCount : (local.followerCount ?? 0),
    winRateLabel: hasLiveWinRate ? winRateRaw : markFakeStat(winRateRaw),
    isWinRatePositive: winRateValue > 0,
    pnlLabel: hasLivePnl ? pnlRaw : markFakeStat(pnlRaw),
    hasPnl: pnlValue != null,
    isPnlPositive: pnlValue != null && Math.round(pnlValue * 100) >= 0,
    performanceCells: buildPerformanceCells(live, openPositions),
  };
};
