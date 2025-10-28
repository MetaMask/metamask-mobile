import { useSelector } from 'react-redux';

import { selectInternalAccountsById } from '../../../selectors/accountsController';
import {
  selectAccountToWalletMap,
  selectWalletsMap,
} from '../../../selectors/multichainAccounts/accountTreeController';
import { UseDisplayNameRequest } from './useDisplayName';

export function useAccountWalletNames(requests: UseDisplayNameRequest[]) {
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToWalletMap = useSelector(selectAccountToWalletMap);
  const walletsMap = useSelector(selectWalletsMap) || {};

  const accountWalletNames = Object.entries(accountToWalletMap).reduce(
    (acc, [accountId, walletId]) => {
      const account = internalAccountsById[accountId];
      const wallet = walletsMap[walletId];
      if (account && wallet) {
        acc[account.address.toLowerCase()] = wallet.metadata.name;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return requests.map((request) => {
    const { value } = request;
    return accountWalletNames[value.toLowerCase()];
  });
}
