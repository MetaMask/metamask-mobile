export interface BatchSellQuoteDetailsTokenData {
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  key?: string;
}

export interface BatchSellQuoteDetailsProps {
  tokenData: BatchSellQuoteDetailsTokenData[];
  totalReceived: string;
  minimumReceived: string;
  onMinimumReceivedInfoPress?: () => void;
}

export type BatchSellQuoteDetailsModalParams = Omit<
  BatchSellQuoteDetailsProps,
  'onMinimumReceivedInfoPress'
>;
