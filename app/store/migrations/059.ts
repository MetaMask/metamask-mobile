import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import { captureException } from '@sentry/react-native';

/**
 * Migration for checking if selectedAccount on AccountsController is undefined
 * If it is, set the field to be an empty string.
 * An undefined value causes the AccountsController to throw an Error
 * Fix: The AccountsController automatically sets the selectedAddress if it is an empty string
 * Fixes issue: View fullstack trace in https://github.com/MetaMask/metamask-mobile/issues/11488
 *
 * @param state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 59)) {
    // Increment the migration number as appropriate
    return state;
  }

  // Check if selectedAccount is undefined
  if (
    hasProperty(state.engine.backgroundState, 'AccountsController') &&
    isObject(state.engine.backgroundState.AccountsController) &&
    hasProperty(
      state.engine.backgroundState.AccountsController,
      'internalAccounts',
    ) &&
    isObject(
      state.engine.backgroundState.AccountsController.internalAccounts,
    ) &&
    hasProperty(
      state.engine.backgroundState.AccountsController.internalAccounts,
      'selectedAccount',
    ) &&
    state.engine.backgroundState.AccountsController.internalAccounts
      .selectedAccount === undefined
  ) {
    // Try to set the selectedAccount to be the first account id
    const internalAccounts =
      state.engine.backgroundState.AccountsController.internalAccounts;
    if (
      hasProperty(internalAccounts, 'accounts') &&
      isObject(internalAccounts.accounts) &&
      Object.keys(internalAccounts.accounts).length > 0
    ) {
      const firstAccount = Object.values(internalAccounts.accounts)[0];
      if (isObject(firstAccount) && hasProperty(firstAccount, 'id')) {
        Logger.log(
          `Migration 59: Setting selectedAccount to the id of the first account.`,
        );
        if (firstAccount.id === undefined) {
          captureException(
            new Error(
              `Migration 59: selectedAccount will be undefined because firstAccount.id is undefined: 'firstAccount: ${firstAccount}'.`,
            ),
          );
        }
        state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
          firstAccount.id;
      }
    } else {
      // Fallback to setting selectedAccount to empty string. AccountsController automatically reconciles the field
      Logger.log(
        `Migration 59: AccountController's selectedAccount is undefined. Setting it to empty string.`,
      );
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        '';
    }
  }

  // Return the modified state
  return state;
}
