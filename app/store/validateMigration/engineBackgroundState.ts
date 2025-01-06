import { ValidationCheck, LOG_TAG } from './validateMigration.types';

/**
 * Verifies that the engine is initialized
 */
export const validateEngineInitialized: ValidationCheck = (state) => {
  const errors: string[] = [];
  if (!state?.engine?.backgroundState) {
    errors.push(`${LOG_TAG}: Engine backgroundState not found.`);
  }
  return errors;
};
