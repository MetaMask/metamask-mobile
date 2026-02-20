import type {
  FeeMarketEIP1559Values,
  GasPriceValue,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { ExistingGas } from '../../../../UnifiedTransactionsView/useUnifiedTxActions';

/**
 * Result of useCancelSpeedupGas: params for controller and display strings.
 */
export interface UseCancelSpeedupGasResult {
  /** Params to pass to speedUpTransaction(txId, params) or stopTransaction(txId, params) */
  paramsForController: GasPriceValue | FeeMarketEIP1559Values | undefined;
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
