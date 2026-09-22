import type {
  FeedItem as CoreFeedItem,
  ProfileSummary,
} from '@metamask/social-controllers';

/**
 * Feed-card fields social-api now returns beside a position. Optional on the
 * wire so a build that predates them still parses; this local view lets the
 * V1 mapper read them before `@metamask/social-controllers` is bumped.
 */
export type FeedCardActor = ProfileSummary & {
  /** 30-day win rate as a 0–1 ratio. */
  winRate30d?: number | null;
  /** 30-day realized PnL in USD. */
  pnl30d?: number | null;
  /** 30-day sell count behind the win rate. */
  tradeCount30d?: number | null;
  /** Profiles following this trader. */
  followerCount?: number | null;
};

export type FeedCardItem = CoreFeedItem & {
  actor: FeedCardActor;
  commentCount?: number;
  replyCount?: number;
  /** Unix seconds of the position's first fill. */
  firstTradeAt?: number | null;
  /** Unix seconds of the first sell in position metrics. */
  firstSellAt?: number | null;
  /**
   * Average entry in USD from remaining cost basis / remaining holding.
   * Null when the position is flat.
   */
  entryPriceUsd?: number | null;
};

export const asFeedCardItem = (item: CoreFeedItem): FeedCardItem =>
  item as FeedCardItem;

/** `winRate30d` is a 0–1 ratio; the badge wants a whole percent. */
export const toWholePercent = (
  fraction: number | null | undefined,
): number | null => {
  if (fraction == null || !Number.isFinite(fraction)) {
    return null;
  }
  return fraction * 100;
};
