import type { TraderProfileResponse } from '@metamask/social-controllers';
import {
  EM_DASH,
  formatCount,
  formatPercent,
  formatSignedFullUsdNoDecimals,
} from '../../utils/formatters';
import type { TraderProfileWithSheetStats } from '../../TraderProfileView/types/traderProfileStatsSheet';
import {
  FAKE_STATS_PREFIX,
  formatSheetHoldFromMinutes,
  prefixFakeStat,
  type StatsSheetFallbackFields,
} from '../../TraderProfileView/components/statsSheetFormatters';
import type { MySocialProfile, ProfileRankingTag } from '../hooks/useMyProfile';
import { myProfileToSheetProfile } from './myProfileToSheetProfile';

export { FAKE_STATS_PREFIX };

export interface OverlayedMyProfileStats {
  rankingTag: ProfileRankingTag | null | undefined;
  followerCount: number;
  winRateLabel: string;
  isWinRatePositive: boolean;
  pnlLabel: string;
  hasPnl: boolean;
  isPnlPositive: boolean;
  holdTimeLabel: string;
  timesCopiedLabel: string;
  fallbackFields: Required<StatsSheetFallbackFields>;
  sheetProfile: TraderProfileWithSheetStats;
}

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

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
  const localSheet = myProfileToSheetProfile(local);
  const liveWinRate = live?.stats.winRate30d;
  const livePnl = live?.stats.pnl30d;
  const liveHold = live?.stats.medianHoldMinutes;
  const liveCopied = live?.copytradedAllTime?.count;
  const liveVolume = live?.stats.volumeUsd30d;
  const liveTradeCount = live?.stats.tradeCount30d;

  const fallbackFields: Required<StatsSheetFallbackFields> = {
    winRate: !isPresentNumber(liveWinRate),
    pnl: !isPresentNumber(livePnl),
    holdTime: !isPresentNumber(liveHold),
    timesCopied: !isPresentNumber(liveCopied),
    volume: !isPresentNumber(liveVolume),
    tradeCount: !isPresentNumber(liveTradeCount),
  };

  const winRateValue = isPresentNumber(liveWinRate)
    ? liveWinRate * 100
    : (local.winRatePercent ?? 0);
  const winRateRaw = isPresentNumber(liveWinRate)
    ? formatPercent(liveWinRate * 100, { showSign: false, decimals: 0 })
    : formatLocalWinRate(local.winRatePercent);
  const pnlValue = fallbackFields.pnl ? local.pnlUsd : livePnl;
  const pnlRaw = formatSignedFullUsdNoDecimals(pnlValue);
  const holdRaw = fallbackFields.holdTime
    ? (local.holdTimeLabel ?? EM_DASH)
    : formatSheetHoldFromMinutes(liveHold) || EM_DASH;
  const copiedRaw = fallbackFields.timesCopied
    ? formatCount(local.timesCopied)
    : formatCount(liveCopied);

  const sheetProfile: TraderProfileWithSheetStats = live
    ? {
        ...live,
        profile: {
          ...live.profile,
          name: local.displayName,
          imageUrl: local.imageUrl ?? live.profile.imageUrl,
        },
        stats: {
          ...live.stats,
          pnl30d: fallbackFields.pnl ? localSheet.stats.pnl30d : livePnl,
          winRate30d: fallbackFields.winRate
            ? localSheet.stats.winRate30d
            : liveWinRate,
          medianHoldMinutes: fallbackFields.holdTime
            ? localSheet.stats.medianHoldMinutes
            : liveHold,
          volumeUsd30d: live.stats.volumeUsd30d,
          tradeCount30d: live.stats.tradeCount30d,
        },
        socialHandles: {
          ...live.socialHandles,
          twitter: local.xHandle ?? live.socialHandles.twitter,
        },
        followerCount: live.followerCount,
        copytradedAllTime:
          live.copytradedAllTime ?? localSheet.copytradedAllTime,
      }
    : localSheet;

  return {
    rankingTag: (live?.rankingTag ?? local.rankingTag) as
      | ProfileRankingTag
      | null
      | undefined,
    followerCount: live ? live.followerCount : (local.followerCount ?? 0),
    winRateLabel: fallbackFields.winRate
      ? markFakeStat(winRateRaw)
      : winRateRaw,
    isWinRatePositive: winRateValue > 0,
    pnlLabel: fallbackFields.pnl ? markFakeStat(pnlRaw) : pnlRaw,
    hasPnl: pnlValue != null,
    isPnlPositive: pnlValue != null && pnlValue >= 0,
    holdTimeLabel: fallbackFields.holdTime ? markFakeStat(holdRaw) : holdRaw,
    timesCopiedLabel: fallbackFields.timesCopied
      ? markFakeStat(copiedRaw)
      : copiedRaw,
    fallbackFields,
    sheetProfile,
  };
};
