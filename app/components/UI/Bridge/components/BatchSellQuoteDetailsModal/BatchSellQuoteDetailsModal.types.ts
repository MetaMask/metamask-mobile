export interface BatchSellQuoteDetailsTokenData {
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  isLoading?: boolean;
  isQuoteUnavailable?: boolean;
  key?: string;
}

export interface BatchSellQuoteDetailsAmountData {
  formatted: string;
}

export interface BatchSellQuoteDetailsProps {
  tokenData: BatchSellQuoteDetailsTokenData[];
  totalReceived: BatchSellQuoteDetailsAmountData;
  minimumReceived: BatchSellQuoteDetailsAmountData;
  isLoading?: boolean;
  isTokenDetailsExpanded?: boolean;
  onMinimumReceivedInfoPress?: () => void;
}
