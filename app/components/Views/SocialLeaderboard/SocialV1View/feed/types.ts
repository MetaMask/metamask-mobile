import type { CaipAssetType } from '@metamask/utils';
import type { PositionTokenAvatarData } from '../../../../UI/SocialFeed/components/PositionTokenAvatar';

export type SocialV1FeedTab = 'trending' | 'following';

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
