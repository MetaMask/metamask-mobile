import { TxData, Quote } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';

export interface BridgeToken {
  address: string;
  symbol: string;
  image: string;
  decimals: number;
  chainId: CaipChainId;
}

// TODO: use type from @metamask/bridge-controller once "approval" is made optional
export interface QuoteResponse {
  quote: Quote;
  approval?: TxData | null;
  trade: TxData;
  estimatedProcessingTimeInSeconds: number;
}
