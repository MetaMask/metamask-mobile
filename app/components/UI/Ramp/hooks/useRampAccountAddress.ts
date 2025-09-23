import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';

/**
 * Hook that returns the appropriate account address for a given CAIP chain identifier.
 *
 * This hook receives a CAIP chain identifier and returns the correct address
 * from the selected account scope. If the specific chain isn't supported,
 * it falls back to any address from the same account group.
 *
 * @param caipChainId - The CAIP chain identifier (e.g., 'eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')
 * @returns The account address for the blockchain, or any fallback address from the same account group, or null if no address available
 *
 */
function useRampAccountAddress(
  caipChainId: CaipChainId | null | undefined,
): string | null {
  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  return useMemo(() => {
    if (!caipChainId) {
      return null;
    }

    const specificAccount = selectInternalAccountByScope(caipChainId);
    if (specificAccount?.address) {
      return specificAccount.address;
    }

    return selectedInternalAccount?.address || null;
  }, [
    caipChainId,
    selectInternalAccountByScope,
    selectedInternalAccount?.address,
  ]);
}

export default useRampAccountAddress;
