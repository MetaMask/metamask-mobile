import Logger from '../../util/Logger';
import { RootState } from '../../reducers';
import { ValidationCheck } from './validateMigration.types';

// checks
import { validateAccountsController } from './accountsController';
import { validateKeyringController } from './keyringController';
import { validateEngineInitialized } from './engineBackgroundState';

const checks: ValidationCheck[] = [
  validateEngineInitialized,
  validateAccountsController,
  validateKeyringController,
];

/**
 * Runs all validations and logs any errors, but doesn’t throw.
 * This makes sure your app keeps running even if some data is unexpected.
 */
export function validatePostMigrationState(state: RootState): void {
  Logger.log('Migration validation started');
  const allErrors = checks.flatMap((check) => check(state));

  // If there are any errors, log them
  if (allErrors.length > 0) {
    Logger.error(new Error('Migration validation errors'), {
      message: `State validation found these issues: ${allErrors.join(', ')}`,
    });
  }
}
