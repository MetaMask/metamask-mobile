import { TxData, Quote } from '@metamask/bridge-controller';
import { Hex, CaipChainId } from '@metamask/utils';

// This is slightly different from the BridgeToken type in @metamask/bridge-controller
export interface BridgeToken {
  address: string;
  name?: string;
  symbol: string;
  image?: string;
  decimals: number;
  chainId: Hex | CaipChainId;
  balance?: string; // A truncated non-atomic balance, e.g. 1.23456
  balanceFiat?: string; // A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
  tokenFiatAmount?: number; // A sortable fiat value in the user's currency, e.g. 100.12345
}

// TODO: use type from @metamask/bridge-controller once "approval" is made optional
export interface QuoteResponse {
  quote: Quote;
  approval?: TxData | null;
  trade: TxData;
  estimatedProcessingTimeInSeconds: number;
}
// TODO: remove this once we move to Unified Swaps
export enum BridgeViewMode {
  Swap = 'Swap',
  Bridge = 'Bridge'
}
