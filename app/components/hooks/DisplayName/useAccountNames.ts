import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectInternalAccountsById } from '../../../selectors/accountsController';
import { selectAccountGroups } from '../../../selectors/multichainAccounts/accountTreeController';
import { UseDisplayNameRequest } from './useDisplayName';

export function useAccountNames(requests: UseDisplayNameRequest[]) {
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountGroups = useSelector(selectAccountGroups);

  // Build the address -> group-name map only when the underlying account data
  // changes, instead of rebuilding it on every render.
  const accountGroupNames = useMemo(
    () =>
      accountGroups.reduce(
        (acc, group) => {
          group.accounts.forEach((accountId) => {
            const account = internalAccountsById[accountId];
            acc[account.address.toLowerCase()] = group.metadata.name;
          });
          return acc;
        },
        {} as Record<string, string>,
      ),
    [accountGroups, internalAccountsById],
  );

  return useMemo(
    () =>
      requests.map((request) => {
        const { value } = request;
        return accountGroupNames[value.toLowerCase()];
      }),
    [requests, accountGroupNames],
  );
}
