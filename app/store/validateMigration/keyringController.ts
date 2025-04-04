import { KeyringControllerState } from '@metamask/keyring-controller';
import { ValidationCheck, LOG_TAG } from './validateMigration.types';

/**
 * Validates the KeyringControllerState to ensure required
 * fields exist and match the expected structure.
 *
 * @param rootState - The Redux state to validate.
 * @returns An array of error messages. If empty, the state is valid.
 */
export const validateKeyringController: ValidationCheck = (rootState) => {
  const errors: string[] = [];

  const keyringControllerState: KeyringControllerState | undefined =
    rootState?.engine?.backgroundState?.KeyringController;

  // If it's missing altogether, return an error
  if (!keyringControllerState) {
    errors.push(
      `${LOG_TAG}: KeyringController state is missing in engine backgroundState.`,
    );
    return errors;
  }

  // 1. Check that vault exists
  if (!keyringControllerState.vault) {
    errors.push(
      `${LOG_TAG}: KeyringController No vault in KeyringControllerState.`,
    );
    return errors;
  }

  const keyrings = keyringControllerState.keyrings;

  // 2. Confirm there is at least one account
  if (!keyrings || Object.keys(keyrings).length === 0) {
    errors.push(`${LOG_TAG}: KeyringController No keyrings found.`);
    return errors;
  }

  return errors;
};
