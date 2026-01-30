import {
  Intent,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import { Asset, TokenRwaData } from '@metamask/assets-controllers';
import { Hex, CaipChainId } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';

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
  accountType?: Asset['accountType'];
  noFee?: {
    isSource: boolean;
    isDestination: boolean;
  };
  aggregators?: string[];
  metadata?: Record<string, unknown>;
  rwaData?: TokenRwaData;
}

export type BridgeQuoteResponse = QuoteResponse &
  QuoteMetadata & {
    aggregator: string;
    walletAddress: string;
    intent?: Intent;
  };

export enum BridgeViewMode {
  Swap = 'Swap',
  Bridge = 'Bridge',
  Unified = 'Unified',
}

export enum TokenSelectorType {
  Source = 'source',
  Dest = 'dest',
}

// ========== Navigation Types ==========

/**
 * Param list for the Bridge screen stack navigator.
 */
export interface BridgeScreenParamList {
  BridgeView:
    | {
        sourcePage?: string;
        bridgeViewMode?: BridgeViewMode;
        sourceToken?: BridgeToken;
        destToken?: BridgeToken;
        sourceAmount?: string;
      }
    | undefined;
}

/**
 * Param list for the Bridge modal stack navigator.
 */
export interface BridgeModalParamList {
  BridgeSourceTokenSelector: undefined;
  BridgeDestTokenSelector: undefined;
  BridgeSourceNetworkSelector: undefined;
  BridgeDestNetworkSelector: undefined;
  SlippageModal: undefined;
  TransactionDetailsBlockExplorer: {
    evmTxMeta?: TransactionMeta;
    multiChainTx?: Transaction;
  };
  QuoteExpiredModal: undefined;
  BlockaidModal: undefined;
  RecipientSelectorModal: undefined;
}

/**
 * Params for TransactionDetailsBlockExplorer route.
 */
export interface TransactionDetailsBlockExplorerParams {
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
}

/**
 * Combined param list for all Bridge-related navigation.
 */
export type BridgeParamList = BridgeScreenParamList & BridgeModalParamList;
