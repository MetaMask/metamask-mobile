import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { selectAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../reducers';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export function useTransactionAccountOverride(): Hex | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';

  return useSelector((state: RootState) =>
    selectAccountOverrideByTransactionId(state, transactionId),
  );
}
