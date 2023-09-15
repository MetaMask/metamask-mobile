import { getPasswordStrengthWord, passwordRequirementsMet } from '.';
import { UNRECOGNIZED_PASSWORD_STRENGTH } from '../../constants/error';

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
