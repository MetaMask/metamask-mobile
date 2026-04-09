/**
 * Bridge navigation parameters
 */

import { Transaction } from '@metamask/keyring-api';
import { TransactionMeta } from '@metamask/transaction-controller';
import { CaipChainId, Hex } from '@metamask/utils';

/** Custom slippage modal parameters */
export interface CustomSlippageModalParams {
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
}

/** Transaction details block explorer parameters */
export interface TransactionDetailsBlockExplorerParams {
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
}

/** Blockaid modal parameters */
export interface BlockaidModalParams {
  errorMessage: string;
  errorType: 'validation' | 'simulation';
}

/** Bridge transaction details parameters */
export interface BridgeTransactionDetailsParams {
  bridgeTxId?: string;
}
