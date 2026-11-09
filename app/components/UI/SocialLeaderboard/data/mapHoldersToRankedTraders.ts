import type { FeedItem } from '@metamask/social-controllers';
import { strings } from '../../../../../locales/i18n';
import type { TraderRowMetric } from '../../../Views/Homepage/Sections/TopTraders/types';
import {
  formatAbbreviatedUsd,
  formatPercent,
  formatSignedAbbreviatedUsd,
} from '../../SocialFeed/utils/formatters';
import type { RankedTrader } from '../types';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/**
 * The holder's P&L on this position: dollars and percent together, either one
 * alone when the other is missing, or nothing when both are.
 */
const buildPnlMetric = (
  pnlValue: number | null | undefined,
  pnlPercent: number | null | undefined,
): TraderRowMetric | undefined => {
  const hasValue = isPresentNumber(pnlValue);
  const hasPercent = isPresentNumber(pnlPercent);
  if (!hasValue && !hasPercent) {
    return undefined;
  }
  const valueLabel = hasValue ? formatSignedAbbreviatedUsd(pnlValue) : '';
  const percentLabel = hasPercent
    ? formatPercent(pnlPercent, { decimals: 1 })
    : '';
  return {
    label:
      valueLabel && percentLabel
        ? `${valueLabel} (${percentLabel})`
        : valueLabel || percentLabel,
    isPositive: ((hasValue ? pnlValue : pnlPercent) ?? 0) >= 0,
  };
};

const DIRECTION_I18N = {
  long: 'social_leaderboard.trader_position.long',
  short: 'social_leaderboard.trader_position.short',
} as const;

/** `20x Long`, or `Short` when the leverage is unknown. None for spot. */
const buildSideTag = (holder: FeedItem): TraderRowMetric | undefined => {
  const direction = holder.perpPositionType;
  if (!direction) {
    return undefined;
  }
  const side = strings(DIRECTION_I18N[direction]);
  return {
    label: isPresentNumber(holder.perpLeverage)
      ? `${holder.perpLeverage}x ${side}`
      : side,
    isPositive: direction === 'long',
  };
};

/**
 * Turns the holders of one asset into leaderboard rows.
 *
 * Keeps the server order, which ranks by position size, and numbers the rows
 * from it. The row shows that position size, uncolored, over the holder's P&L.
 * A profile holding through more than one wallet keeps only its largest
 * position, so each trader appears once.
 */
export const mapHoldersToRankedTraders = (
  holders: FeedItem[],
  isFollowing: (profileId: string) => boolean,
): RankedTrader[] => {
  const seen = new Set<string>();
  const rows: RankedTrader[] = [];
  for (const holder of holders) {
    const { actor } = holder;
    if (seen.has(actor.profileId)) {
      continue;
    }
    seen.add(actor.profileId);
    const rank = rows.length + 1;
    rows.push({
      id: actor.profileId,
      address: actor.address,
      rank,
      overallRank: rank,
      username: actor.name,
      avatarUri: actor.imageUrl ?? undefined,
      percentageChange: holder.pnlPercent ?? 0,
      pnlValue: holder.pnlValueUsd ?? 0,
      pnl30d: actor.pnl30d ?? null,
      winRatePercent: null,
      pnlPerChain: {},
      followerCount: actor.followerCount ?? 0,
      isFollowing: isFollowing(actor.profileId),
      displayMetric: {
        label: formatAbbreviatedUsd(holder.positionValueUSD),
        isPositive: true,
        isNeutral: true,
      },
      secondaryMetric: buildPnlMetric(holder.pnlValueUsd, holder.pnlPercent),
      nameTag: buildSideTag(holder),
    });
  }
  return rows;
};
