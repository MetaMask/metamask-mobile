import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectInternalAccountsById } from '../../../selectors/accountsController';
import {
  selectAccountToWalletMap,
  selectWalletsMap,
} from '../../../selectors/multichainAccounts/accountTreeController';
import { UseDisplayNameRequest } from './useDisplayName';

// Stable reference returned when there is only a single wallet (no subtitles).
const EMPTY_WALLET_NAMES: (string | undefined)[] = [];

export function useAccountWalletNames(requests: UseDisplayNameRequest[]) {
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToWalletMap = useSelector(selectAccountToWalletMap);
  const walletsMapResult = useSelector(selectWalletsMap);

  // Memoize so the wallet-name map and per-request lookup are only rebuilt when
  // the underlying data (or requests) change, and consumers get a stable array.
  return useMemo(() => {
    const walletsMap = walletsMapResult || {};
    const haveMoreThanOneWallet = Object.keys(walletsMap).length > 1;

    if (!haveMoreThanOneWallet) {
      return EMPTY_WALLET_NAMES;
    }

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
  }, [requests, accountToWalletMap, internalAccountsById, walletsMapResult]);
}
