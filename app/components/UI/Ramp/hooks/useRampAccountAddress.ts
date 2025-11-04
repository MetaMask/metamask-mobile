import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';

/**
 * Hook that returns the appropriate account address for a given CAIP chain identifier.
 *
 * This hook receives a CAIP chain identifier and returns the correct address
 * from the selected account scope, or null if the account doesn't support the chain.
 *
 * @param caipChainId - The CAIP chain identifier (e.g., 'eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')
 * @returns The account address for the blockchain, or null if not supported
 *
 */
function useRampAccountAddress(
  caipChainId: CaipChainId | null | undefined,
): string | null {
  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  return useMemo(() => {
    if (!caipChainId) {
      return null;
    }

    const account = selectInternalAccountByScope(caipChainId);

    if (!account?.address) {
      return null;
    }

    return getFormattedAddressFromInternalAccount(account);
  }, [caipChainId, selectInternalAccountByScope]);
}

export default useRampAccountAddress;
