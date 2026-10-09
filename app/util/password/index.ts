import SecureKeychain from '../../core/SecureKeychain';
import Engine from '../../core/Engine';
import { UNRECOGNIZED_PASSWORD_STRENGTH } from '../../constants/error';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Whether to show the inline "passwords don't match" error.
 * Requires the confirm field to reach {@link MIN_PASSWORD_LENGTH} first so
 * early typing does not flash a mismatch error.
 *
 * @param password - New password value.
 * @param confirmPassword - Confirm password value.
 * @returns True when the mismatch error should be shown.
 */
export const shouldShowPasswordMismatchError = (
  password: string,
  confirmPassword: string,
): boolean =>
  password !== '' &&
  confirmPassword.length >= MIN_PASSWORD_LENGTH &&
  password !== confirmPassword;

export const getPasswordStrengthWord = (strength: number) => {
  if (strength < 0) {
    throw new Error(UNRECOGNIZED_PASSWORD_STRENGTH);
  } else if (strength < 3) {
    return 'weak';
  } else if (strength === 3) {
    return 'good';
  } else {
    return 'strong';
  }
};

export const passwordRequirementsMet = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH;

interface PasswordValidationResponse {
  valid: boolean;
  message: string;
}

export const doesPasswordMatch = async (
  input: string,
): Promise<PasswordValidationResponse> => {
  try {
    // first try to get the stored password
    const credentials = await SecureKeychain.getGenericPassword();
    if (credentials) {
      try {
        // then we verify if the stored password matches the one that can decrypt the vault
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { KeyringController } = Engine.context as any;
        await KeyringController.exportSeedPhrase({
          password: credentials.password,
        });
        // now that we are confident that the user is logged in, we can test that the input matches
        if (input === credentials.password) {
          return {
            valid: true,
            message: 'The input matches the stored password',
          };
        }
        return {
          valid: false,
          message: 'The input does not match the stored password',
        };
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        return {
          valid: false,
          message: error.toString(),
        };
      }
    }
    return {
      valid: false,
      message: 'no password stored',
    };
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      valid: false,
      message: error.toString(),
    };
  }
};
