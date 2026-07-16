import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectInternalAccountsById } from '../../../selectors/accountsController';
import { selectAccountGroups } from '../../../selectors/multichainAccounts/accountTreeController';
import { UseDisplayNameRequest } from './useDisplayName';

export function useAccountNames(requests: UseDisplayNameRequest[]) {
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountGroups = useSelector(selectAccountGroups);

  const accountGroupNames = useMemo(
    () =>
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
    [accountGroups, internalAccountsById],
  );

  return requests.map((request) => {
    const { value } = request;
    return accountGroupNames[value.toLowerCase()];
  });
}
