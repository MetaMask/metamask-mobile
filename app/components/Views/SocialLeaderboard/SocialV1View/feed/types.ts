import type { PositionTokenAvatarData } from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';

export type {
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../../UI/SocialFeed/types';

export type SocialV1FeedTab = 'trending' | 'following';

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
   * Chain name for `GET /v1/tokens/:chain/:contractAddress/feed`. Set from
   * the first loaded row that has a contract. Absent for perp-only chips.
   */
  chain?: string;
  /** Contract address paired with {@link chain}. Absent for perp-only chips. */
  contractAddress?: string;
}

/**
 * Token-feed page the hot-token carousel loads for the selected chip.
 * `null` means the rail is not driving the feed (no selection, or a chip
 * with no contract).
 */
export interface SocialV1TokenFeedState {
  posts: SocialV1FeedPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseSocialV1HotTokensResult {
  tokens: SocialV1HotToken[];
  isLoading: boolean;
  error: string | null;
}
