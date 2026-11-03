import type { TraderProfileResponse } from '@metamask/social-controllers';
import {
  EM_DASH,
  formatPercent,
  formatSignedFullUsdNoDecimals,
} from '../../../../UI/SocialFeed/utils/formatters';
import {
  FAKE_STATS_PREFIX,
  formatSheetHoldFromMinutes,
  formatSheetUnsignedUsd,
  prefixFakeStat,
} from '../../TraderProfileView/components/statsSheetFormatters';
import type { MySocialProfile, ProfileRankingTag } from '../hooks/useMyProfile';

export { FAKE_STATS_PREFIX };

export type PerformanceCellId = 'pnl' | 'winRate' | 'holdTime' | 'volume';

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
  /** Live-only stats for the Performance grid; cells without data are omitted. */
  performanceCells: PerformanceCell[];
}

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

export const buildPerformanceCells = (
  live: TraderProfileResponse | null,
): PerformanceCell[] => {
  const stats = live?.stats;
  if (!stats) {
    return [];
  }
  const cells: PerformanceCell[] = [];
  if (isPresentNumber(stats.pnl30d)) {
    cells.push({
      id: 'pnl',
      value: formatSignedFullUsdNoDecimals(stats.pnl30d),
      tone: stats.pnl30d >= 0 ? 'success' : 'error',
    });
  }
  if (isPresentNumber(stats.winRate30d)) {
    cells.push({
      id: 'winRate',
      value: formatPercent(stats.winRate30d * 100, {
        showSign: false,
        decimals: 0,
      }),
      tone: 'default',
    });
  }
  const holdTime = isPresentNumber(stats.medianHoldMinutes)
    ? formatSheetHoldFromMinutes(stats.medianHoldMinutes)
    : '';
  if (holdTime) {
    cells.push({ id: 'holdTime', value: holdTime, tone: 'default' });
  }
  const volume = isPresentNumber(stats.volumeUsd30d)
    ? formatSheetUnsignedUsd(stats.volumeUsd30d)
    : '';
  if (volume) {
    cells.push({ id: 'volume', value: volume, tone: 'default' });
  }
  return cells;
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
  const pnlRaw = formatSignedFullUsdNoDecimals(pnlValue);

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
    isPnlPositive: pnlValue != null && pnlValue >= 0,
    performanceCells: buildPerformanceCells(live),
  };
};
