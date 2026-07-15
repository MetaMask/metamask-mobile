import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  getPostQuoteTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { selectPayQuoteConfig } from '../../../../../selectors/featureFlagController/confirmations';
import { RootState } from '../../../../../reducers';

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
  const transactionType = getPostQuoteTransactionType(transactionMeta);
  const config = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, transactionType),
  );

  const canSelectWithdrawToken = isWithdraw && config.enabled === true;

  return {
    isWithdraw,
    canSelectWithdrawToken,
  };
}
