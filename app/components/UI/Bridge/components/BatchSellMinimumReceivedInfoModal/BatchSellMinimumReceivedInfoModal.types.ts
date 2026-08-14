/**
 * Caller routes that open this info sheet, restored via `replace` on back.
 * Neither takes route params, so only the screen name is forwarded.
 */
export type BatchSellMinimumReceivedInfoSourceScreen =
  | 'BatchSellFinalReviewModal'
  | 'BatchSellQuoteDetailsModal';

export interface BatchSellMinimumReceivedInfoModalParams {
  sourceModal?: {
    screen: BatchSellMinimumReceivedInfoSourceScreen;
  };
}
