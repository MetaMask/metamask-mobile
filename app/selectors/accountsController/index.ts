import { createSelector } from 'reselect';
import { RootState } from '../../reducers';

const selectAccountsControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountsController;

export const selectInternalAccounts = createSelector(
  selectAccountsControllerState,
  (accountControllerState) =>
    Object.values(accountControllerState.internalAccounts.accounts),
);
