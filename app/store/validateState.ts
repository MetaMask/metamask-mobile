import Logger from '../util/Logger';
import { RootState } from '../reducers';
import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Each validation check is a function that:
 * - Takes the final (post-migration) Redux state,
 * - Returns an array of error strings if any validations fail or an empty array otherwise.
 */
type ValidationCheck = (state: RootState) => string[];

const LOG_TAG = 'MIGRATION_VALIDATE_STATE_ERROR';

/**
 * Verifies that the engine is initialized
 */
const checkEngineInitialized: ValidationCheck = (state) => {
  const errors: string[] = [];
  if (!state.engine?.backgroundState) {
    errors.push(`${LOG_TAG}: Engine backgroundState not found.`);
  }
  return errors;
};

/**
 * Validates the AccountsControllerState to ensure required
 * fields exist and match the expected structure.
 *
 * @param rootState - The Redux state to validate.
 * @returns An array of error messages. If empty, the state is valid.
 */
const checkAccountsController: ValidationCheck = (rootState) => {
  const errors: string[] = [];

  // Safely access the AccountsController state in the engine backgroundState
  const accountsState: AccountsControllerState | undefined =
    rootState.engine?.backgroundState?.AccountsController;

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

/**
 * If you have more checks, simply define them above and add them to this array.
 */
const checks: ValidationCheck[] = [
  checkEngineInitialized,
  checkAccountsController,
];

/**
 * Runs all validations and logs any errors, but doesn’t throw.
 * This makes sure your app keeps running even if some data is unexpected.
 */
export function validatePostMigrationState(state: RootState): void {
  const allErrors: string[] = [];

  for (const check of checks) {
    const errors = check(state);
    if (errors.length > 0) {
      allErrors.push(...errors);
    }
  }

  // If there are any errors, log them
  if (allErrors.length > 0) {
    Logger.error(new Error('Migration validation errors'), {
      message: `State validation found these issues: ${allErrors.join(', ')}`,
    });
  }
}
