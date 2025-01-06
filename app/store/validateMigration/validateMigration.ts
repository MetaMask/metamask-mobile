import Logger from '../../util/Logger';
import { RootState } from '../../reducers';
import { LOG_TAG, ValidationCheck } from './validateMigration.types';

// checks
import { validateAccountsController } from './accountsController';
import { validateKeyringController } from './keyringController';

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

const checks: ValidationCheck[] = [
  checkEngineInitialized,
  validateAccountsController,
  validateKeyringController,
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
