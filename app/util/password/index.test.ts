import {
  doesPasswordMatch,
  getPasswordStrengthWord,
  passwordRequirementsMet,
} from '.';
import { UNRECOGNIZED_PASSWORD_STRENGTH } from '../../constants/error';

const mockExportSeedPhrase = jest.fn().mockResolvedValue(new Uint8Array());

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      exportSeedPhrase: (...args: unknown[]) => mockExportSeedPhrase(...args),
    },
  },
}));

const mockGetGenericPassword = jest.fn();
jest.mock('../../core/SecureKeychain', () => ({
  getGenericPassword: (...args: unknown[]) => mockGetGenericPassword(...args),
}));

describe('getPasswordStrength', () => {
  it('should return correct values', () => {
    for (let i = 0; i < 6; i++) {
      const password_strength = getPasswordStrengthWord(i);
      if (i < 3) {
        expect(password_strength).toEqual('weak');
      } else if (i === 3) {
        expect(password_strength).toEqual('good');
      } else if (i >= 4) {
        expect(password_strength).toEqual('strong');
      }
    }
  });
  it('should throw when password strength is unrecognized', () => {
    expect(() => getPasswordStrengthWord(-1)).toThrowError(
      UNRECOGNIZED_PASSWORD_STRENGTH,
    );
  });
});

describe('doesPasswordMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportSeedPhrase.mockResolvedValue(new Uint8Array());
  });

  it('calls exportSeedPhrase', async () => {
    mockGetGenericPassword.mockResolvedValue({ password: 'stored-password' });

    await doesPasswordMatch('stored-password');

    expect(mockExportSeedPhrase).toHaveBeenCalledWith({
      password: 'stored-password',
    });
  });

  it('returns valid: true when input matches the stored password', async () => {
    mockGetGenericPassword.mockResolvedValue({ password: 'my-password' });

    const result = await doesPasswordMatch('my-password');

    expect(result).toEqual({ valid: true, message: expect.any(String) });
  });

  it('returns valid: false when input does not match the stored password', async () => {
    mockGetGenericPassword.mockResolvedValue({ password: 'my-password' });

    const result = await doesPasswordMatch('wrong-password');

    expect(result).toEqual({ valid: false, message: expect.any(String) });
  });

  it('returns valid: false when no credentials are stored', async () => {
    mockGetGenericPassword.mockResolvedValue(null);

    const result = await doesPasswordMatch('any-password');

    expect(result).toEqual({ valid: false, message: expect.any(String) });
    expect(mockExportSeedPhrase).not.toHaveBeenCalled();
  });
});

describe('passwordRequirementsMet', () => {
  it('should pass when password is 8 in length', () => {
    expect(passwordRequirementsMet('lolololo')).toEqual(true);
  });
  it('should pass when password is gt 8 in length', () => {
    expect(passwordRequirementsMet('lololololol')).toEqual(true);
  });
  it('should fail when password is lt 8 in length', () => {
    expect(passwordRequirementsMet('lol')).toEqual(false);
  });
});
