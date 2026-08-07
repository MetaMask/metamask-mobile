import { useSelector } from 'react-redux';

import { selectMetaMaskPayHardwareFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Whether hardware wallets are allowed to pay for the current MM Pay
 * transaction type.
 */
export function useIsMMPayHardwareEnabled(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabled, enabledTransactionTypes } = useSelector(
    selectMetaMaskPayHardwareFlags,
  );

  return (
    enabled && hasTransactionType(transactionMeta, enabledTransactionTypes)
  );
}
