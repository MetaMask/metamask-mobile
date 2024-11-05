import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';

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
    Logger.log(
      `Migration 59: AccountController's selectedAccount is undefined. Setting it to empty string.`,
    );
    state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
      '';
  }

  // Return the modified state
  return state;
}
