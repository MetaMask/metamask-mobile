import { createSelector } from 'reselect';
import {
  AccountTrackerState,
  AccountInformation,
} from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { toChecksumAddress } from 'ethereumjs-util';

const selectAccountTrackerControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTrackerController;

export const selectAccounts = createDeepEqualSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerState) =>
    accountTrackerControllerState.accounts,
);

export const selectAccountsByChainId = createSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerState) =>
    accountTrackerControllerState.accountsByChainId,
);

export const selectAccountsLength = createSelector(
  selectAccounts,
  (accounts: { [address: string]: AccountInformation }) =>
    Object.keys(accounts || {}).length,
);

export const selectAccountByChainId = createDeepEqualSelector(
  (state: RootState) => state.engine.backgroundState,
  (backgroundState) => {
    const { AccountTrackerController, NetworkController, AccountsController } =
      backgroundState;
    const accountsByChainId = AccountTrackerController.accountsByChainId;
    const chainId = NetworkController.providerConfig.chainId;
    const selectedAccountId =
      AccountsController.internalAccounts.selectedAccount;
    const selectedAccountAddress =
      AccountsController.internalAccounts.accounts[selectedAccountId].address;
    return accountsByChainId[chainId][
      toChecksumAddress(selectedAccountAddress)
    ];
  },
);
