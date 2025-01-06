import { ValidationCheck, LOG_TAG } from './validateMigration.types';

import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Validates the AccountsControllerState to ensure required
 * fields exist and match the expected structure.
 *
 * @param rootState - The Redux state to validate.
 * @returns An array of error messages. If empty, the state is valid.
 */
export const validateAccountsController: ValidationCheck = (rootState) => {
  const errors: string[] = [];

  const accountsState: AccountsControllerState | undefined =
    rootState?.engine?.backgroundState?.AccountsController;

  // If it's missing altogether, return an error
  if (!accountsState) {
    errors.push(
      `${LOG_TAG}: AccountsController state is missing in engine backgroundState.`,
    );
    return errors;
  }

  // 1. Check that internalAccounts exists
  if (!accountsState.internalAccounts) {
    errors.push(
      `${LOG_TAG}: AccountsController No internalAccounts object found on AccountsControllerState.`,
    );
    return errors;
  }

  const { selectedAccount, accounts } = accountsState.internalAccounts;

  // 2. Confirm there is at least one account
  if (!accounts || Object.keys(accounts).length === 0) {
    errors.push(
      `${LOG_TAG}: AccountsController No accounts found in internalAccounts.accounts.`,
    );
    return errors;
  }

  // 3. Check that selectedAccount is non-empty
  if (!selectedAccount) {
    errors.push(
      `${LOG_TAG}: AccountsController selectedAccount is missing or empty.`,
    );
    return errors;
  }

  // 4. Confirm the selectedAccount ID exists in internalAccounts.accounts
  if (!accounts[selectedAccount]) {
    errors.push(
      `${LOG_TAG}: AccountsController The selectedAccount '${selectedAccount}' does not exist in the accounts record.`,
    );
  }

  return errors;
};
