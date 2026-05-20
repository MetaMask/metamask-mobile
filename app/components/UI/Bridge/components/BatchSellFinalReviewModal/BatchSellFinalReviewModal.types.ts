import { BatchSellQuoteDetailsModalParams } from '../BatchSellQuoteDetailsModal/BatchSellQuoteDetailsModal.types';

export interface BatchSellFinalReviewSourceTokenData {
  key: string;
  tokenSymbol: string;
  image?: string;
}

export interface BatchSellFinalReviewModalParams
  extends BatchSellQuoteDetailsModalParams {
  sourceTokens: BatchSellFinalReviewSourceTokenData[];
  networkFee: string;
  networkFeeFiat: string;
  metamaskFeePercent: string;
}
