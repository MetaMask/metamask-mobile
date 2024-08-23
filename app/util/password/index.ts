import SecureKeychain from '../../core/SecureKeychain';
import Engine from '../../core/Engine';
import { regex } from '../regex';

export const MIN_PASSWORD_LENGTH = 8;

export const getPasswordStrength = (password: string) => {
  const minLength = 8;
  const hasUpperCase = regex.hasUpperCase.test(password);
  const hasLowerCase = regex.hasLowerCase.test(password);
  const hasNumbers = regex.hasNumbers.test(password);
  const hasSpecialChars = regex.hasSpecialChars.test(password);

  let strengthScore = 0;

  if (password.length >= minLength) strengthScore++;
  if (hasUpperCase) strengthScore++;
  if (hasLowerCase) strengthScore++;
  if (hasNumbers) strengthScore++;
  if (hasSpecialChars) strengthScore++;

  let strength;
  if (strengthScore <= 2) {
    strength = 'weak';
  } else if (strengthScore === 3 || strengthScore === 4) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return strength;
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
        await KeyringController.exportSeedPhrase(credentials.password);
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
