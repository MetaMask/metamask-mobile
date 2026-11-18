import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPackPartnerInternalAccount } from '../selectors/account';
import type { PackPartnerAccount } from '../types/packPartner';

/** Selected account group's Solana mainnet account, memoized to `{ id, address }`. */
export const usePackPartnerAccount = (): PackPartnerAccount | undefined => {
  const account = useSelector(selectPackPartnerInternalAccount);
  const id = account?.id;
  const address = account?.address;

  return useMemo(
    () => (id && address ? { id, address } : undefined),
    [id, address],
  );
};
