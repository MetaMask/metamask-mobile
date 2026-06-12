import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEvmChainId } from './networkController';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { Hex } from '@metamask/utils';
import { getAccountTrackerControllerAccountsByChainId } from './assets/assets-migration';

export { getAccountTrackerControllerAccountsByChainId as selectAccountsByChainId };

export const selectAccounts = createDeepEqualSelector(
  getAccountTrackerControllerAccountsByChainId,
  selectEvmChainId,
  (accountsByChainId, chainId) => accountsByChainId?.[chainId] || {},
);

export const selectAccountsLength = createSelector(
  selectAccounts,
  (accounts) => Object.keys(accounts).length,
);

export const selectAccountBalanceByChainId = createDeepEqualSelector(
  getAccountTrackerControllerAccountsByChainId,
  selectEvmChainId,
  selectSelectedInternalAccountFormattedAddress,
  (_state: RootState, chainId?: Hex) => chainId,
  (
    accountsByChainId,
    globalChainId,
    selectedInternalAccountChecksummedAddress,
    chainId,
  ) => {
    const accountsBalance = selectedInternalAccountChecksummedAddress
      ? accountsByChainId?.[chainId ?? globalChainId]?.[
          selectedInternalAccountChecksummedAddress
        ]
      : undefined;
    return accountsBalance;
  },
);
