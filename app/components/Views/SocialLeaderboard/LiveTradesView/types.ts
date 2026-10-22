import type { Position } from '@metamask/social-controllers';
import type { PositionTokenAvatarData } from '../../../UI/SocialFeed/components/PositionTokenAvatar';
import type { SocialLivePriceSource } from '../../../UI/SocialFeed/live/types';
import type {
  SocialV1FeedAuthor,
  SocialV1PerpDirection,
  SocialV1SpotSide,
} from '../../../UI/SocialFeed/types';

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
  /** Current unit price, or market cap with its `(MC)` suffix for spot. */
  subtitleLabel: string;
  /** Whether this trade closed the position. Closed cards take the P&L tone. */
  isClosed: boolean;
  /** Realized P&L in USD, shown in a closed card's result line. */
  valueLabel: string;
  /** P&L as a percent. */
  pnlLabel: string;
  /** P&L in USD, abbreviated. Leads an open card's right-hand column. */
  pnlValueLabel?: string;
  isPnlPositive: boolean;
  /** Epoch milliseconds of the closing fill. */
  closedAtMs?: number;
  positionId: string;
  /**
   * Token market cap in USD at trade time. Null when the triggering fill
   * omitted it (always for perps). Used by the market-cap filter.
   */
  marketCapUsd: number | null;
  /** Handed to the position details sheet so it opens without a fetch. */
  position?: Position;
  /** How an open row's figures follow a streamed price. */
  live?: SocialLivePriceSource;
}
