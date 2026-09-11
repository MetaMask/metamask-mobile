import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';

export type SocialV1PerpDirection = 'long' | 'short';
export type SocialV1SpotSide = 'buy' | 'sell';

export interface SocialV1FeedAsset {
  symbol: string;
  avatar: PositionTokenAvatarData;
}

interface SocialV1FeedItemBase {
  id: string;
  asset: SocialV1FeedAsset;
  /** Author comment. Presence selects the detailed (big) card. */
  comment?: string;
  /** Optional in-card sparkline; traders can attach a chart to a position post. */
  showChart?: boolean;
  chartSeries?: number[];
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
