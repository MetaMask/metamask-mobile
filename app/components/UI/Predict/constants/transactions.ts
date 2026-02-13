import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

/**
 * Temporary custom transaction type for the Predict deposit-and-order flow.
 * This will be added to @metamask/transaction-controller in a future release.
 * For now, we use a string constant cast to TransactionType.
 */
export const PredictDepositAndOrderTransactionType =
  'predictDepositAndOrder' as TransactionType;

/** Address used to represent "Predict Balance" as the payment token (synthetic option). */
export const PREDICT_BALANCE_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000000001' as Hex;

/** Chain id used for the "Predict Balance" payment option (Polygon). */
export const PREDICT_BALANCE_CHAIN_ID = '0x89' as Hex;
