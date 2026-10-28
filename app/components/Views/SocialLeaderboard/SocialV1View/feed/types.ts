import type { CaipAssetType } from '@metamask/utils';
import type { PositionTokenAvatarData } from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';

export type SocialV1FeedTab = 'trending' | 'following';

export interface UseSocialV1FeedResult {
  posts: SocialV1FeedPost[];
  /**
   * The viewer's own new posts, to render above `posts` regardless of sort or
   * filters. Following only; always empty on Trending.
   */
  pinnedPosts: SocialV1FeedPost[];
  isLoading: boolean;
  /** True while a follow-up page is being fetched. */
  isFetchingNextPage: boolean;
  /** True when another page can be requested. */
  hasNextPage: boolean;
  /** Request the next page; no-op if none remain or one is in flight. */
  loadMore: () => void;
  error: string | null;
  /** Timestamp of the latest successful server response, including empty data. */
  dataUpdatedAt?: number;
  /**
   * Reset to the first page and refetch -- also the recovery path after an
   * error. Releases pinned posts the feed now serves or never will.
   */
  refresh: () => Promise<void>;
}

/** One chip in the feed's hot-tokens carousel. */
export interface SocialV1HotToken {
  /** Stable key (`asset:<SYMBOL>`), also the chip's test ID suffix. */
  id: string;
  /**
   * Icon symbol. Perps keep the raw market id (`xyz:NVDA`); spot uses the
   * ticker. The chip renders `avatar`, which carries the same value.
   */
  symbol: string;
  /** Chip title: the asset name when the feed has one, otherwise the ticker. */
  label: string;
  avatar: PositionTokenAvatarData;
  /**
   * Every asset the chip groups (spot and perp rows sharing the ticker), most
   * frequent first, at most ten. Selecting the chip filters the feed to them.
   */
  assetIds: CaipAssetType[];
}

export interface UseSocialV1HotTokensResult {
  tokens: SocialV1HotToken[];
  isLoading: boolean;
  error: string | null;
}
