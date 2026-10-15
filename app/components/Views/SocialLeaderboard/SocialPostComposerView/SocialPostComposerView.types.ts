import type { Position } from '@metamask/social-controllers';

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

/** Where a pre-attached position was shared from. Kept for later analytics. */
export type SocialPostComposerEntryPoint = 'token_details';

interface SocialPostComposerTradeParams {
  tradeInFlight: {
    transactionHash: string;
    /** Social-api chain slug (`base`), not CAIP. */
    chain: string;
    tokenAddress: string;
  };
  preview: SocialPostTradePreview;
  position?: never;
  entryPoint?: never;
}

interface SocialPostComposerPositionParams {
  /** Fast path: position passed by the host screen. No fetch fires. */
  position: Position;
  entryPoint: SocialPostComposerEntryPoint;
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
