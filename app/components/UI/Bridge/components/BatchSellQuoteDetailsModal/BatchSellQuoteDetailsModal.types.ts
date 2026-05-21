export interface BatchSellQuoteDetailsTokenData {
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  isLoading?: boolean;
  isQuoteUnavailable?: boolean;
  key?: string;
}

export interface BatchSellQuoteDetailsProps {
  tokenData: BatchSellQuoteDetailsTokenData[];
  totalReceived: string;
  minimumReceived: string;
  isLoading?: boolean;
  isTokenDetailsExpanded?: boolean;
  onMinimumReceivedInfoPress?: () => void;
}
