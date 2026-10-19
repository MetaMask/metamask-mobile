import { strings } from '../../../../../locales/i18n';
import {
  formatAbbreviatedCount,
  formatAbbreviatedUsd,
  formatPercent,
  formatSignedAbbreviatedUsd,
} from './formatters';
import type { SocialV1FeedAuthor } from '../types';

/** How long each stat holds the line before the next one takes over. */
export const TRADER_STAT_ROTATION_MS = 5000;

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
