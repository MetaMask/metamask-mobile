import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

import { selectInternalAccountsById } from '../../../selectors/accountsController';
import { selectAccountGroups } from '../../../selectors/multichainAccounts/accountTreeController';
import { UseDisplayNameRequest } from './useDisplayName';

export const selectAccountGroupNamesByAddress = createSelector(
  [selectInternalAccountsById, selectAccountGroups],
  (internalAccountsById, accountGroups) =>
    accountGroups.reduce(
      (acc, group) => {
        group.accounts.forEach((accountId) => {
          const account = internalAccountsById[accountId];
          if (!account) {
            return;
          }
          acc[account.address.toLowerCase()] = group.metadata.name;
        });
        return acc;
      },
      {} as Record<string, string>,
    ),
);

export function useAccountNames(requests: UseDisplayNameRequest[]) {
  const accountGroupNames = useSelector(selectAccountGroupNamesByAddress);

  return requests.map((request) => {
    const { value } = request;
    return accountGroupNames[value.toLowerCase()];
  });
}
