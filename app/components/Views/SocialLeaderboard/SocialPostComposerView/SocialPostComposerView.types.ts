/**
 * Optional route params when opening the composer after a just-submitted swap.
 * Absent when the user opens the composer from `+` / Share first trade.
 */
export interface SocialPostComposerViewParams {
  tradeInFlight: {
    transactionHash: string;
    /** Social-api chain slug (`base`), not CAIP. */
    chain: string;
    tokenAddress: string;
  };
  preview: {
    tokenSymbol: string;
    tokenAddress: string;
    chain: string;
    tokenImageUrl?: string | null;
    side: 'buy' | 'sell';
    costLabel?: string;
    entryPriceLabel?: string;
  };
}
