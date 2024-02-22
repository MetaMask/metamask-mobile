import { createSelector } from 'reselect';
import {
  AccountTrackerState,
  AccountInformation,
} from '@metamask/assets-controllers';
import { RootState } from '../reducers';

const selectAccountTrackerControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTrackerController;

export const selectAccounts = createSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerState) =>
    accountTrackerControllerState.accounts,
);

export const selectAccountsLength = createSelector(
  selectAccounts,
  (accounts: { [address: string]: AccountInformation }) =>
    Object.keys(accounts || {}).length,
);
