import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';

export type SocialV1PerpDirection = 'long' | 'short';
export type SocialV1SpotSide = 'buy' | 'sell';

export interface SocialV1FeedAsset {
  symbol: string;
  avatar: PositionTokenAvatarData;
}

/** The trader who published the post, rendered in the post header. */
export interface SocialV1FeedAuthor {
  /** Social API trader id, used to open their profile. */
  id: string;
  username: string;
  /** Wallet address, used for the Maskicon fallback when there is no avatar. */
  address?: string;
  avatarUri?: string | null;
  /**
   * Whole percent (e.g. `92` for 92%), matching the leaderboard's
   * `TopTrader.winRatePercent`. `null` when the window has no win-rate data,
   * in which case the badge is omitted.
   */
  winRatePercent: number | null;
}

interface SocialV1FeedItemBase {
  id: string;
  author: SocialV1FeedAuthor;
  /** Post time in seconds or milliseconds -- see `tradeTimestampToMs`. */
  timestamp: number;
  asset: SocialV1FeedAsset;
  /** Author comment. Presence selects the detailed (big) card. */
  comment?: string;
  valueLabel: string;
  pnlLabel: string;
  isPnlPositive: boolean;
}

export interface SocialV1PerpsOpenFeedItem extends SocialV1FeedItemBase {
  variant: 'perpsOpen';
  direction: SocialV1PerpDirection;
  markPriceLabel?: string;
  leverageLabel?: string;
  autoCloseLabel?: string;
  entryPriceLabel?: string;
}

export interface SocialV1PerpsClosedFeedItem extends SocialV1FeedItemBase {
  variant: 'perpsClosed';
  direction: SocialV1PerpDirection;
  leverageLabel?: string;
  entryPriceLabel?: string;
  exitPriceLabel?: string;
  holdTimeLabel?: string;
  statusLabel?: string;
}

export interface SocialV1SpotCompactFeedItem extends SocialV1FeedItemBase {
  variant: 'spotCompact';
  side: SocialV1SpotSide;
  marketCapLabel?: string;
  volumeLabel?: string;
}

export type SocialV1FeedItem =
  | SocialV1PerpsOpenFeedItem
  | SocialV1PerpsClosedFeedItem
  | SocialV1SpotCompactFeedItem;

export interface UseSocialV1FeedResult {
  items: SocialV1FeedItem[];
  isLoading: boolean;
  error: string | null;
}
