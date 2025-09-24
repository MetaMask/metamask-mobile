import { TxData, Quote, Intent } from '@metamask/bridge-controller';
import { Hex, CaipChainId } from '@metamask/utils';

// This is slightly different from the BridgeToken type in @metamask/bridge-controller
export interface BridgeToken {
  address: string;
  name?: string;
  symbol: string;
  image?: string;
  decimals: number;
  chainId: Hex | CaipChainId;
  // A non-truncated non-atomic balance, e.g. 1.23456789,
  // can always do calculations on this, regardless of small numbers
  // I.e. will NOT be "< 0.00001" like TokenI.balance
  balance?: string;
  balanceFiat?: string; // A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
  tokenFiatAmount?: number; // A sortable fiat value in the user's currency, e.g. 100.12345
  currencyExchangeRate?: number; // A rate of the token in the user's currency, e.g. 100.12345
}

// TODO: use type from @metamask/bridge-controller once "approval" is made optional
export interface QuoteResponse {
  quote: Quote;
  approval?: TxData | null;
  trade: TxData;
  estimatedProcessingTimeInSeconds: number;
}

export interface CowSwapQuoteResponse extends QuoteResponse {
  aggregator: string;
  walletAddress: string;
  intent?: Intent;
}

export enum BridgeViewMode {
  Swap = 'Swap',
  Bridge = 'Bridge',
  Unified = 'Unified',
}
