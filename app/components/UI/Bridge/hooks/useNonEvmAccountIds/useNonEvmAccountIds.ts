import { useSelector } from 'react-redux';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useMemo } from 'react';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { isNonEvmChainId } from '@metamask/bridge-controller';

/**
 * Hook to get account IDs for non-EVM accounts
 * @returns {string[]} Array of account IDs for accounts that have non-EVM scopes
 */
export const useNonEvmAccountIds = (): string[] => {
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledSourceChainIds = useMemo(
    () =>
      enabledSourceChains.map((chain) => chain.chainId).filter(isNonEvmChainId),
    [enabledSourceChains],
  );

  const selectedAccountGroupInternalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );

  const nonEvmAccountIds = useMemo(
    () =>
      selectedAccountGroupInternalAccounts
        .filter((account) =>
          account.scopes.some((scope) => enabledSourceChainIds.includes(scope)),
        )
        .map((account) => account.id),
    [selectedAccountGroupInternalAccounts, enabledSourceChainIds],
  );

  return nonEvmAccountIds;
};
