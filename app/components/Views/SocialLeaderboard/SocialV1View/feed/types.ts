import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';
import type { SocialV1MockedField } from './mockMarker';

export type SocialV1PerpDirection = 'long' | 'short';
export type SocialV1SpotSide = 'buy' | 'sell';
export type SocialV1FeedTab = 'trending' | 'following';

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
  /** Author comment. */
  comment?: string;
  valueLabel: string;
  pnlLabel: string;
  isPnlPositive: boolean;
  /**
   * Which of this item's values the client invented. The marked labels already
   * carry a visible `*`; this is the structural record of the same fact, so
   * tests and later cleanup do not have to match on rendered copy.
   *
   * Optional: absent means nothing is mocked, which keeps composer-built items
   * from having to declare provenance they do not have.
   */
  mockedFields?: SocialV1MockedField[];
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

export interface SocialV1SpotOpenFeedItem extends SocialV1FeedItemBase {
  variant: 'spotOpen';
  side: SocialV1SpotSide;
  markPriceLabel?: string;
  entryPriceLabel?: string;
  /** Time held so far, first fill to now. */
  holdTimeLabel?: string;
}

export interface SocialV1SpotClosedFeedItem extends SocialV1FeedItemBase {
  variant: 'spotClosed';
  side: SocialV1SpotSide;
  entryPriceLabel?: string;
  exitPriceLabel?: string;
  holdTimeLabel?: string;
  statusLabel?: string;
}

/**
 * Composer-shared spot position. Reuses the open card layout; Copy trade is
 * gated by `showCopyTrade` so a closed share still has no CTA.
 */
export interface SocialV1SpotShareFeedItem extends SocialV1FeedItemBase {
  variant: 'spotShare';
  side: SocialV1SpotSide;
  markPriceLabel?: string;
  entryPriceLabel?: string;
  holdTimeLabel?: string;
  showCopyTrade?: boolean;
}

/**
 * Two layouts -- open and closed -- crossed with the asset class. Open cards
 * lead with current value and offer Copy trade; closed cards lead with realized
 * P&L and offer nothing, because there is no longer a position to copy. The
 * asset class only decides which stat rows sit between. `spotShare` is the
 * composer insert of a spot position.
 */
export type SocialV1FeedItem =
  | SocialV1PerpsOpenFeedItem
  | SocialV1PerpsClosedFeedItem
  | SocialV1SpotOpenFeedItem
  | SocialV1SpotClosedFeedItem
  | SocialV1SpotShareFeedItem;

export interface SocialV1FeedPost {
  id: string;
  authorHandle: string;
  authorImageUrl?: string | null;
  winRateLabel?: string;
  timestampMs: number;
  /**
   * Swap-comment id for the Call this post reacts to. Absent on pending
   * composer posts and on live rows with no authorComment.
   */
  commentId?: string;
  reactions: { emotion: string; count: number }[];
  /** Session/API viewer emotion when known. */
  userReaction?: string | null;
  gifUri?: string;
  isPending?: boolean;
  item: SocialV1FeedItem;
}

export interface UseSocialV1FeedResult {
  posts: SocialV1FeedPost[];
  pendingPost: SocialV1FeedPost | null;
  pendingStartedAtMs: number | null;
  isLoading: boolean;
  /** True while a follow-up page is being fetched. */
  isFetchingNextPage: boolean;
  /** True when another page can be requested. */
  hasNextPage: boolean;
  /** Request the next page; no-op if none remain or one is in flight. */
  loadMore: () => void;
  error: string | null;
  /** Reset to the first page and refetch -- also the recovery path after an error. */
  refresh: () => Promise<void>;
}

/** One chip in the feed's hot-tokens carousel. */
export interface SocialV1HotToken {
  /** Stable key, also used as the chip's test ID suffix. */
  id: string;
  /**
   * Perps market symbol (e.g. `BTC`, `NVDA`, or a HIP-3 `dex:SYMBOL`). Drives
   * icon resolution, which falls back to a monogram when no icon is published.
   */
  symbol: string;
  /** Editorial label -- the topic's name, not the ticker (e.g. `Bitcoin perps`). */
  label: string;
}

export interface UseSocialV1HotTokensResult {
  tokens: SocialV1HotToken[];
  isLoading: boolean;
  error: string | null;
}
