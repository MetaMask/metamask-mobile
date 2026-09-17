import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';
import type { FeedAudience } from '../../FeedView/types';
import type { SocialV1MockedField } from './mockMarker';

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
  /** Author comment. Invented for now, so it carries the mock marker. */
  comment?: string;
  valueLabel: string;
  pnlLabel: string;
  isPnlPositive: boolean;
  /**
   * Which of this item's values the client invented. The marked labels already
   * carry a visible `*`; this is the structural record of the same fact, so
   * tests and later cleanup do not have to match on rendered copy.
   */
  mockedFields: SocialV1MockedField[];
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
 * Two layouts -- open and closed -- crossed with the asset class. Open cards
 * lead with current value and offer Copy trade; closed cards lead with realized
 * P&L and offer nothing, because there is no longer a position to copy. The
 * asset class only decides which stat rows sit between.
 */
export type SocialV1FeedItem =
  | SocialV1PerpsOpenFeedItem
  | SocialV1PerpsClosedFeedItem
  | SocialV1SpotOpenFeedItem
  | SocialV1SpotClosedFeedItem;

export interface UseSocialV1FeedOptions {
  /** `all` reads the generic `leaderboard` scope, `following` the per-user one. */
  audience?: FeedAudience;
  /** Gate the query. Always additionally gated on unlock by `useTraderFeed`. */
  enabled?: boolean;
}

/**
 * Mirrors the outside of `useTraderFeed` so the V1 shell gets the same
 * pagination and error surface as V0; the V1 map and the mock overlay are the
 * only things this hook adds.
 */
export interface UseSocialV1FeedResult {
  items: SocialV1FeedItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  error: string | null;
  refresh: () => Promise<void>;
}
