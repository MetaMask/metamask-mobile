import { useSelector } from 'react-redux';

import { RootState } from '../../../../../reducers';
import { selectPayHardwareConfig } from '../../../../../selectors/featureFlagController/confirmations';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Whether hardware wallets are allowed to pay for the current MM Pay
 * transaction type.
 */
export function useIsMMPayHardwareEnabled(): boolean {
  const transactionMeta = useTransactionMetadataRequest();

  const config = useSelector((state: RootState) =>
    selectPayHardwareConfig(state, transactionMeta?.type),
  );

  return config.enabled === true;
}
