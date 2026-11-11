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
   * exists. A missing number renders as zero (`$0.00`, `0%`, or `0m`).
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

/** Hold label when the API has no positive median (`null` or `0`). */
const ZERO_HOLD_LABEL = '0m';

const presentOrZero = (value: number | null | undefined): number =>
  isPresentNumber(value) ? value : 0;

/**
 * Hold label for the performance grid. `0` and missing minutes both read as
 * `0m`; a positive median keeps the compact duration (`3h`, `1d 20h`).
 */
const formatPerformanceHold = (minutes: number | null | undefined): string => {
  const label = isPresentNumber(minutes)
    ? formatSheetHoldFromMinutes(minutes)
    : '';
  return label || ZERO_HOLD_LABEL;
};

export const buildPerformanceCells = (
  live: TraderProfileResponse | null,
  openPositions: readonly Position[] = [],
): PerformanceCell[] => {
  const stats = live?.stats;
  if (!stats) {
    return [];
  }

  const pnl = presentOrZero(stats.pnl30d);
  const unrealized = presentOrZero(
    sumUnrealizedFromOpenPositions(openPositions),
  );
  const winRate = presentOrZero(stats.winRate30d);
  const volume = presentOrZero(stats.volumeUsd30d);

  return [
    {
      id: 'pnl',
      value: formatPerformanceSignedUsd(pnl),
      tone: signedUsdTone(pnl),
    },
    {
      id: 'unrealizedPnl',
      value: formatPerformanceSignedUsd(unrealized),
      tone: roundsToZeroCents(unrealized)
        ? 'default'
        : signedUsdTone(unrealized),
    },
    {
      id: 'winRate',
      value: formatPercent(winRate * 100, {
        showSign: false,
        decimals: 0,
      }),
      tone: 'default',
    },
    {
      id: 'holdTime',
      value: formatPerformanceHold(stats.medianHoldMinutes),
      tone: 'default',
    },
    {
      id: 'volume',
      value: formatUsd(Math.abs(volume)),
      tone: 'default',
    },
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
