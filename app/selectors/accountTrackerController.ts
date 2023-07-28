import { createSelector } from 'reselect';
import {
  AccountTrackerState,
  AccountInformation,
} from '@metamask/assets-controllers';
import { EngineState } from './types';

const selectAccountTrackerControllerState = (state: EngineState) =>
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
