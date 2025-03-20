import { createSelector } from 'reselect';
import {
  AccountTrackerControllerState,
  AccountInformation,
} from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEvmChainId } from './networkController';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { Hex } from '@metamask/utils';

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
  // Use a function that takes state and optional chainId parameter
  (state: RootState, chainIdOverride?: Hex) =>
    chainIdOverride || selectEvmChainId(state),
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
