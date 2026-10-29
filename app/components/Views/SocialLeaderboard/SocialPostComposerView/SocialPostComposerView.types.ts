import type { Position, TradeInFlight } from '@metamask/social-controllers';
import type { SocialV1PerpDirection } from '../../../UI/SocialFeed/types';

/**
 * Card shown while a just-submitted swap is still being indexed.
 */
export interface SocialPostTradePreview {
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  tokenImageUrl?: string | null;
  side: 'buy' | 'sell';
  costLabel?: string;
  entryPriceLabel?: string;
}

/**
 * Card shown while a just-accepted Hyperliquid order is still being indexed.
 * `tokenAddress` is the market id (`BTC`, `xyz:TSLA`), not a contract.
 */
export interface SocialPostPerpsPreview {
  product: 'perps';
  tokenSymbol: string;
  tradeSymbol: string;
  tokenAddress: string;
  direction: SocialV1PerpDirection;
  leverageLabel?: string;
  costLabel?: string;
  entryPriceLabel?: string;
}

export type SocialPostComposerPreview =
  | SocialPostTradePreview
  | SocialPostPerpsPreview;

/** Where a pre-attached position was shared from. Kept for later analytics. */
export type SocialPostComposerEntryPoint = 'token_details' | 'perps';

interface SocialPostComposerTradeParams {
  tradeInFlight: TradeInFlight;
  preview: SocialPostComposerPreview;
  position?: never;
  entryPoint?: never;
  openFeedAfterPost?: never;
}

interface SocialPostComposerPositionParams {
  /** Fast path: position passed by the host screen. No fetch fires. */
  position: Position;
  entryPoint: SocialPostComposerEntryPoint;
  /**
   * On success, replace the composer with Social V1 instead of landing on the
   * viewer's Posts tab. Used by the Perps share screen.
   */
  openFeedAfterPost?: boolean;
  tradeInFlight?: never;
  preview?: never;
}

/**
 * Route params for the composer.
 * A swap share passes `tradeInFlight`. Token details passes the open
 * `position` so the card is attached immediately. Both are absent when the
 * user opens the composer from `+`.
 *
 * The `never` members keep plain property access (`params?.preview`) compiling
 * on either branch, matching `TraderPositionViewParams`.
 */
export type SocialPostComposerViewParams =
  | SocialPostComposerTradeParams
  | SocialPostComposerPositionParams;
