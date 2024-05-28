import { createSelector } from 'reselect';
import {
  AccountTrackerState,
  AccountInformation,
} from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

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
