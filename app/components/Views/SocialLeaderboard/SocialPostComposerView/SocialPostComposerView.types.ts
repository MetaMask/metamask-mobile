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

/**
 * Route params for the composer.
 * A swap share passes `tradeInFlight`. Token details passes the open
 * `position` so the card is attached immediately. Both are absent when the
 * user opens the composer from `+`.
 */
export type SocialPostComposerViewParams =
  | {
      tradeInFlight: {
        transactionHash: string;
        /** Social-api chain slug (`base`), not CAIP. */
        chain: string;
        tokenAddress: string;
      };
      preview: SocialPostTradePreview;
    }
  | {
      position: Position;
    };
