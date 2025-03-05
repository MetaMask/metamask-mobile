import { createSelector } from 'reselect';
import {
  AccountTrackerControllerState,
  AccountInformation,
} from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEvmChainId } from './networkController';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';

const selectAccountTrackerControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTrackerController;

export const selectAccounts = createDeepEqualSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerControllerState) =>
    accountTrackerControllerState.accounts,
);
export const selectAccountsByChainId = createDeepEqualSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerControllerState) =>
    accountTrackerControllerState.accountsByChainId,
);
export const selectAccountsLength = createSelector(
  selectAccounts,
  (accounts: { [address: string]: AccountInformation }) =>
    Object.keys(accounts || {}).length,
);
export const selectAccountBalanceByChainId = createDeepEqualSelector(
  selectAccountsByChainId,
  selectEvmChainId,
  selectSelectedInternalAccountFormattedAddress,
  (accountsByChainId, chainId, selectedInternalAccountChecksummedAddress) => {
    const accountsBalance = selectedInternalAccountChecksummedAddress
      ? accountsByChainId?.[chainId]?.[
          selectedInternalAccountChecksummedAddress
        ]
      : undefined;
    return accountsBalance;
  },
);
