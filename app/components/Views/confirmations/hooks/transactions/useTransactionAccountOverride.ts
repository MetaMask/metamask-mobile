import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { selectAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../reducers';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export function useTransactionAccountOverride(): Hex | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';

  // Mobile only sets EVM account overrides; Core resolves the non-EVM source
  // account from the account group of the transaction account.
  return useSelector(
    (state: RootState) =>
      selectAccountOverrideByTransactionId(state, transactionId) as
        | Hex
        | undefined,
  );
}
