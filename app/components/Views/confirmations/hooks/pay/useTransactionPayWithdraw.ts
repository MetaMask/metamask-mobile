import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';

/**
 * Whether the withdraw token picker feature is enabled.
 * When false, withdrawals always use the default Polygon USDC.E.
 */
const isWithdrawTokenPickerEnabled =
  process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN === 'true';

export interface UseTransactionPayWithdrawResult {
  /** Whether this transaction is a withdraw type */
  isWithdraw: boolean;
  /** Whether the user can select a different withdraw token (feature flag) */
  canSelectWithdrawToken: boolean;
}

/**
 * Hook for checking withdraw transaction status and feature flag.
 *
 * Note: To update the withdraw destination token, use setPayToken from
 * useTransactionPayToken - it handles both deposit and withdraw token updates.
 */
export function useTransactionPayWithdraw(): UseTransactionPayWithdrawResult {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);

  // Feature flag check is tied to withdraw transaction type.
  // Future transaction types (e.g., Perps) may have their own feature flags.
  const canSelectWithdrawToken = isWithdraw && isWithdrawTokenPickerEnabled;

  return {
    isWithdraw,
    canSelectWithdrawToken,
  };
}
