import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';

/**
 * Whether the withdrawal token picker feature is enabled.
 * When false, withdrawals always use the default Polygon USDC.E.
 */
const isWithdrawalTokenPickerEnabled =
  process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN === 'true';

export interface UseWithdrawalTokenResult {
  /** Whether this transaction is a withdrawal type */
  isWithdrawal: boolean;
  /** Whether the user can select a different withdrawal token (feature flag) */
  canSelectWithdrawalToken: boolean;
}

/**
 * Hook for checking withdrawal transaction status and feature flag.
 *
 * Note: To update the withdrawal destination token, use setPayToken from
 * useTransactionPayToken - it handles both deposit and withdrawal token updates.
 */
export function useWithdrawalToken(): UseWithdrawalTokenResult {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdrawal = isTransactionPayWithdraw(transactionMeta);

  return {
    isWithdrawal,
    canSelectWithdrawalToken: isWithdrawal && isWithdrawalTokenPickerEnabled,
  };
}
