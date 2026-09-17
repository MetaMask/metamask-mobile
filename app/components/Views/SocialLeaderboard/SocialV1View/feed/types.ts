import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';

export type SocialV1PerpDirection = 'long' | 'short';
export type SocialV1SpotSide = 'buy' | 'sell';
export type SocialV1FeedTab = 'trending' | 'following';

export interface SocialV1FeedAsset {
  symbol: string;
  avatar: PositionTokenAvatarData;
}

interface SocialV1FeedItemBase {
  id: string;
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

export interface SocialV1SpotShareFeedItem extends SocialV1FeedItemBase {
  variant: 'spotShare';
  side: SocialV1SpotSide;
  markPriceLabel?: string;
  entryPriceLabel?: string;
  holdTimeLabel?: string;
  showCopyTrade?: boolean;
}

export type SocialV1FeedItem =
  | SocialV1PerpsOpenFeedItem
  | SocialV1PerpsClosedFeedItem
  | SocialV1SpotCompactFeedItem
  | SocialV1SpotShareFeedItem;

export interface SocialV1FeedPost {
  id: string;
  authorHandle: string;
  authorImageUrl?: string | null;
  winRateLabel?: string;
  timestampMs: number;
  likeCount: number;
  commentCount: number;
  gifUri?: string;
  isPending?: boolean;
  item: SocialV1FeedItem;
}

export interface UseSocialV1FeedResult {
  posts: SocialV1FeedPost[];
  pendingPost: SocialV1FeedPost | null;
  pendingStartedAtMs: number | null;
  isLoading: boolean;
  error: string | null;
}
