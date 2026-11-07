import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { selectAccountOverrideAddressByTransactionId } from '../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../reducers';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

/**
 * Address of the account override of the current transaction. Core stores the
 * override as an `InternalAccount` ID; Mobile only sets EVM account overrides.
 *
 * @returns The address of the account override, if any.
 */
export function useTransactionAccountOverride(): Hex | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';

  return useSelector((state: RootState) =>
    selectAccountOverrideAddressByTransactionId(state, transactionId),
  );
}
