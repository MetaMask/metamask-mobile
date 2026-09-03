import { useSelector } from 'react-redux';

import { RootState } from '../../../../../reducers';
import { selectPayHardwareConfig } from '../../../../../selectors/featureFlagController/confirmations';
import { getPayTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Whether hardware wallets are allowed to pay for the current MM Pay
 * transaction type.
 */
export function useIsMMPayHardwareEnabled(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const payType = getPayTransactionType(transactionMeta);

  const isEnabled = useSelector(
    (state: RootState) =>
      selectPayHardwareConfig(state, payType ?? transactionMeta?.type)
        .enabled === true,
  );

  return isEnabled;
}
