///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { createSelector } from 'reselect';
import { XlmScope } from '@metamask/keyring-api';
import { RootState } from '../../reducers';
import { defaultAccountsControllerState } from '../../core/Engine/controllers/accounts-controller/constants';
import { selectIsStellarAccountsEnabled } from '../featureFlagController/stellarAccountsEnabled';

const selectInternalAccountsById = (state: RootState) =>
  (
    state.engine?.backgroundState?.AccountsController ??
    defaultAccountsControllerState
  ).internalAccounts.accounts;

const selectHasStellarAccount = createSelector(
  selectInternalAccountsById,
  (accounts) =>
    Object.values(accounts).some((account) =>
      account.scopes.some((scope) =>
        Object.values(XlmScope).includes(scope as XlmScope),
      ),
    ),
);

/**
 * Returns true when Stellar should be visible: feature flag enabled OR user has a Stellar account.
 */
export const selectIsStellarChainVisible = createSelector(
  selectIsStellarAccountsEnabled,
  selectHasStellarAccount,
  (isStellarAccountsEnabled, hasStellarAccount) =>
    isStellarAccountsEnabled || hasStellarAccount,
);
///: END:ONLY_INCLUDE_IF
