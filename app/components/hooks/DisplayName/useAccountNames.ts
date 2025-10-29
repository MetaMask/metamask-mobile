import { useSelector } from 'react-redux';

import {
  selectInternalAccounts,
  selectInternalAccountsById,
} from '../../../selectors/accountsController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectAccountGroups } from '../../../selectors/multichainAccounts/accountTreeController';
import { areAddressesEqual } from '../../../util/address';
import { UseDisplayNameRequest } from './useDisplayName';

export function useAccountNames(requests: UseDisplayNameRequest[]) {
  const internalAccounts = useSelector(selectInternalAccounts);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountGroups = useSelector(selectAccountGroups);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  if (isMultichainAccountsState2Enabled) {
    const accountGroupNames = accountGroups.reduce(
      (acc, group) => {
        group.accounts.forEach((accountId) => {
          const account = internalAccountsById[accountId];
          acc[account.address.toLowerCase()] = group.metadata.name;
        });
        return acc;
      },
      {} as Record<string, string>,
    );

    return requests.map((request) => {
      const { value } = request;
      return accountGroupNames[value.toLowerCase()];
    });
  }

  return requests.map((request) => {
    const { value } = request;
    const foundAccount = internalAccounts.find((account) =>
      areAddressesEqual(account.address, value),
    );
    return foundAccount?.metadata?.name;
  });
}
