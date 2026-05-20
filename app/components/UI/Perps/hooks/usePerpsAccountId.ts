import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipAccountId } from '@metamask/utils';
import { formatAccountToCaipAccountId } from '@metamask/perps-controller';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectChainId } from '../../../../selectors/networkController';

/**
 * Returns the current user's CAIP-10 account ID for perps-related features
 * such as the VIP badge.
 */
export function usePerpsAccountId(): CaipAccountId | null {
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const chainId = useSelector(selectChainId);

  return useMemo(() => {
    if (!evmAccount?.address) return null;
    return formatAccountToCaipAccountId(evmAccount.address, chainId);
  }, [evmAccount?.address, chainId]);
}
