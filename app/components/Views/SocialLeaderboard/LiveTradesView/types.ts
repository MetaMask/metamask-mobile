import type { PositionTokenAvatarData } from '../components/PositionTokenAvatar';
import type {
  SocialV1FeedAuthor,
  SocialV1PerpDirection,
  SocialV1SpotSide,
} from '../SocialV1View/feed/types';

export interface LiveTradeRowModel {
  id: string;
  type: 'spot' | 'perps';
  traderId: string;
  traderAddress: string;
  timestampMs: number;
  author: SocialV1FeedAuthor;
  authorHandle: string;
  authorImageUrl: string | null;
  symbol: string;
  avatar: PositionTokenAvatarData;
  side?: SocialV1SpotSide;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  markPriceLabel: string;
  amountLabel: string;
  valueLabel: string;
  positionId: string;
  /**
   * Token market cap in USD at trade time. Null when the triggering fill
   * omitted it (always for perps). Used by the market-cap filter.
   */
  marketCapUsd: number | null;
}
