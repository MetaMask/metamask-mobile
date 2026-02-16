import type { TransactionMeta } from '@metamask/transaction-controller';

/**
 * Existing gas from the transaction being sped up or canceled.
 * EIP-1559: gwei decimals (from weiHexToGweiDec).
 * Legacy: gas price as number.
 */
export interface LegacyExistingGas {
  isEIP1559Transaction?: false;
  gasPrice?: number | string;
}

export interface Eip1559ExistingGas {
  isEIP1559Transaction: true;
  maxFeePerGas?: number | string;
  maxPriorityFeePerGas?: number | string;
}

export type ExistingGas = LegacyExistingGas | Eip1559ExistingGas;

/**
 * Params to pass to speedUpTransaction or stopTransaction.
 * EIP-1559: hex maxFeePerGas, maxPriorityFeePerGas.
 * Legacy: gasPrice hex, or undefined (controller applies rate).
 */
export interface CancelSpeedupParams {
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
}

/**
 * Result of useCancelSpeedupGas: params for controller and display strings.
 */
export interface UseCancelSpeedupGasResult {
  /** Params to pass to speedUpTransaction(txId, params) or stopTransaction(txId, params) */
  paramsForController: CancelSpeedupParams | undefined;
  /** Display string for "Network fee" row (e.g. "0.001 ETH") */
  networkFeeDisplay: string;
  /** Native fee amount only (e.g. "0.001") for layout with icon */
  networkFeeNative: string;
  /** Fiat fee (e.g. "$0.65") or null when testnet/hidden */
  networkFeeFiat: string | null;
  /** Display string for "Speed" row (e.g. "Market < 30 sec") */
  speedDisplay: string;
  /** Native currency symbol for the chain (e.g. "ETH") */
  nativeTokenSymbol: string;
}

export interface UseCancelSpeedupGasInput {
  existingGas: ExistingGas | null;
  tx: TransactionMeta | null;
  isCancel: boolean;
}
