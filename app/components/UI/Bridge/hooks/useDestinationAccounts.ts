import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAccounts } from '../../../hooks/useAccounts';
import { selectValidDestInternalAccountIds } from '../../../../selectors/bridge';
import { selectAccountGroups } from '../../../../selectors/multichainAccounts/accountTreeController';

/**
 * Custom hook that provides filtered destination accounts for bridge operations
 */
export const useDestinationAccounts = () => {
  const { accounts, ensByAccountAddress } = useAccounts();

  // Filter accounts using BIP-44 aware multichain selectors via account IDs
  const validDestIds = useSelector(selectValidDestInternalAccountIds);
  const accountGroups = useSelector(selectAccountGroups);

  const destinationAccounts = useMemo(() => {
    if (!validDestIds || validDestIds.size === 0) return [];
    return accounts
      .filter((account) => validDestIds.has(account.id))
      .map((account) => {
        // Use account group name if available, otherwise use account name
        let accountName = account.name;

        const accountGroup = accountGroups.find((group) =>
          group.accounts.includes(account.id),
        );
        accountName = accountGroup?.metadata.name || account.name;
        return {
          ...account,
          name: accountName,
        };
      });
  }, [accounts, validDestIds, accountGroups]);

  return { destinationAccounts, ensByAccountAddress };
};
