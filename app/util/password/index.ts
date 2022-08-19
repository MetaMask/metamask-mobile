import SecureKeychain from '../../core/SecureKeychain';
import Engine from '../../core/Engine';

export const MIN_PASSWORD_LENGTH = 8;
type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const getPasswordStrengthWord = (strength: PasswordStrength) => {
  switch (strength) {
    case 0:
      return 'weak';
    case 1:
      return 'weak';
    case 2:
      return 'weak';
    case 3:
      return 'good';
    case 4:
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
  } catch (error: any) {
    return {
      valid: false,
      message: error.toString(),
    };
  }
};
