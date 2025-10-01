import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useMemo } from 'react';

const NON_EVM_CHAIN_IDS: CaipChainId[] = [SolScope.Mainnet, BtcScope.Mainnet];

/**
 * Hook to get account IDs for non-EVM accounts
 * @returns {string[]} Array of account IDs for accounts that have non-EVM scopes
 */
export const useNonEvmAccountIds = (): string[] => {
  const selectedAccountGroupInternalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );

  const nonEvmAccountIds = useMemo(
    () =>
      selectedAccountGroupInternalAccounts
        .filter((account) =>
          account.scopes.some((scope) => NON_EVM_CHAIN_IDS.includes(scope)),
        )
        .map((account) => account.id),
    [selectedAccountGroupInternalAccounts],
  );

  return nonEvmAccountIds;
};
