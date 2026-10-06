import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCollectorCryptInternalAccount } from '../selectors/account';
import type { SolanaAccountRef } from '../types';

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
