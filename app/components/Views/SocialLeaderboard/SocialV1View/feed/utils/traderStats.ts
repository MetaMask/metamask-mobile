import { strings } from '../../../../../../../locales/i18n';
import {
  LEADERBOARD_COHORT_LEADING_EMOJI,
  type LeaderboardTraderCohort,
} from '../../../components/Filters/filterOptions';
import {
  formatAbbreviatedCount,
  formatAbbreviatedUsd,
  formatPercent,
  formatSignedAbbreviatedUsd,
} from '../../../utils/formatters';
import type { SocialV1FeedAuthor } from '../types';

/** How long each stat holds the line before the next one takes over. */
export const TRADER_STAT_ROTATION_MS = 5000;

/**
 * 30-day PnL thresholds behind the cohort, mirroring the social-api ranking
 * tag defaults (`RANKING_TAG_DOLPHIN_MIN_PNL_30D` / `..._WHALE_...`). The feed
 * actor carries `pnl30d` but not the tag itself, so the band is resolved here
 * until the API sends it.
 */
export const COHORT_DOLPHIN_MIN_PNL_30D = 10_000;
export const COHORT_WHALE_MIN_PNL_30D = 100_000;

/**
 * The trader's cohort band, or `null` when there is no 30-day PnL to place
 * them with. A loss is still a shrimp — the band is about size, and leaving a
 * losing trader unbadged would read as missing data rather than a low tier.
 */
export function resolveTraderCohort(
  pnl30d: number | null | undefined,
): LeaderboardTraderCohort | null {
  if (pnl30d == null || !Number.isFinite(pnl30d)) {
    return null;
  }
  if (pnl30d >= COHORT_WHALE_MIN_PNL_30D) {
    return 'whale';
  }
  if (pnl30d >= COHORT_DOLPHIN_MIN_PNL_30D) {
    return 'dolphin';
  }
  return 'shrimp';
}

/** The cohort's emoji, sharing the leaderboard filter's mapping. */
export function traderCohortEmoji(
  cohort: LeaderboardTraderCohort | null,
): string | undefined {
  return cohort ? LEADERBOARD_COHORT_LEADING_EMOJI[cohort] : undefined;
}

/**
 * The stat line under a trader's name, as an ordered list the header rotates
 * through: 30-day PnL, followers, then win rate.
 *
 * Only stats the API actually reported are included, so a trader with no
 * history shows nothing rather than a row of dashes. A single stat is returned
 * as a one-item list, which the rotator renders as a static label.
 */
export function buildTraderStatLabels(author: SocialV1FeedAuthor): string[] {
  const labels: string[] = [];

  if (author.pnl30d != null && Number.isFinite(author.pnl30d)) {
    labels.push(
      strings('social_leaderboard.feed.trader_stats.pnl_30d', {
        // "P&L" already names the value, so a winning trader reads `$50K`
        // rather than `+$50K`. A loss keeps its sign, where it carries meaning.
        pnl:
          author.pnl30d < 0
            ? formatSignedAbbreviatedUsd(author.pnl30d)
            : formatAbbreviatedUsd(author.pnl30d),
      }),
    );
  }

  if (author.followerCount != null && author.followerCount > 0) {
    labels.push(
      strings('social_leaderboard.feed.trader_stats.followers', {
        count: formatAbbreviatedCount(author.followerCount),
      }),
    );
  }

  if (author.winRatePercent != null) {
    labels.push(
      strings('social_leaderboard.feed.trader_stats.win_rate', {
        winRate: formatPercent(author.winRatePercent, {
          showSign: false,
          decimals: 0,
        }),
      }),
    );
  }

  return labels;
}
