import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { COLLECTOR_CRYPT_SCOPE } from '../constants';
import type { SolanaAccountRef } from '../types';

/** Solana mainnet account of the selected account group, as an InternalAccount. */
export const selectCollectorCryptInternalAccount = (
  state: RootState,
): InternalAccount | undefined =>
  selectSelectedInternalAccountByScope(state)(COLLECTOR_CRYPT_SCOPE);

/** Selected account group's Solana mainnet account, memoized to `{ id, address }`. */
export const useCollectorCryptAccount = (): SolanaAccountRef | undefined => {
  const account = useSelector(selectCollectorCryptInternalAccount);
  const id = account?.id;
  const address = account?.address;

  return useMemo(
    () => (id && address ? { id, address } : undefined),
    [id, address],
  );
};
