/**
 * Caller route that opens this info sheet, restored via `replace` on back.
 * It takes no route params, so only the screen name is forwarded.
 */
export type BatchSellNetworkFeeInfoSourceScreen = 'BatchSellFinalReviewModal';

export interface BatchSellNetworkFeeInfoModalParams {
  sourceModal?: {
    screen: BatchSellNetworkFeeInfoSourceScreen;
  };
}
