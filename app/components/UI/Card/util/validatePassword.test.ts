import { validatePassword } from './validatePassword';

describe('validatePassword', () => {
  describe('when password meets all requirements', () => {
    it('returns true for valid password with all required characters', () => {
      const validPassword = 'Password123!';

      const result = validatePassword(validPassword);

      expect(result).toBe(true);
    });

    it('returns true for password with minimum length and all character types', () => {
      const validPassword = 'Abc123!@';

      const result = validatePassword(validPassword);

      expect(result).toBe(true);
    });

    it('returns true for password with multiple special characters', () => {
      const validPassword = 'MyPass123!@#$%';

      const result = validatePassword(validPassword);

      expect(result).toBe(true);
    });

    it('returns true for password with various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{};\':"|,.<>/?';
      const validPassword = `Test123${specialChars}`;

      const result = validatePassword(validPassword);

      expect(result).toBe(true);
    });
  });

  describe('when password is too short', () => {
    it('returns false for password with 7 characters', () => {
      const shortPassword = 'Test12!';

      const result = validatePassword(shortPassword);

      expect(result).toBe(false);
    });

    it('returns false for empty password', () => {
      const emptyPassword = '';

      const result = validatePassword(emptyPassword);

      expect(result).toBe(false);
    });

    it('returns false for single character password', () => {
      const singleChar = 'A';

      const result = validatePassword(singleChar);

      expect(result).toBe(false);
    });
  });

  describe('when password lacks uppercase letters', () => {
    it('returns false for password with only lowercase letters', () => {
      const noUppercase = 'password123!';

      const result = validatePassword(noUppercase);

      expect(result).toBe(false);
    });

    it('returns false for password with numbers and special chars but no uppercase', () => {
      const noUppercase = 'mypass123!@#';

      const result = validatePassword(noUppercase);

      expect(result).toBe(false);
    });
  });

  describe('when password lacks lowercase letters', () => {
    it('returns false for password with only uppercase letters', () => {
      const noLowercase = 'PASSWORD123!';

      const result = validatePassword(noLowercase);

      expect(result).toBe(false);
    });

    it('returns false for password with numbers and special chars but no lowercase', () => {
      const noLowercase = 'MYPASS123!@#';

      const result = validatePassword(noLowercase);

      expect(result).toBe(false);
    });
  });

  describe('when password lacks numbers', () => {
    it('returns false for password with only letters and special chars', () => {
      const noNumbers = 'Password!@#';

      const result = validatePassword(noNumbers);

      expect(result).toBe(false);
    });

    it('returns false for password with mixed case letters but no numbers', () => {
      const noNumbers = 'MyPasswordWithSpecial!';

      const result = validatePassword(noNumbers);

      expect(result).toBe(false);
    });
  });

  describe('when password lacks special characters', () => {
    it('returns false for password with only alphanumeric characters', () => {
      const noSpecialChars = 'Password123';

      const result = validatePassword(noSpecialChars);

      expect(result).toBe(false);
    });

    it('returns false for password with mixed case and numbers but no special chars', () => {
      const noSpecialChars = 'MyPassword123';

      const result = validatePassword(noSpecialChars);

      expect(result).toBe(false);
    });
  });

  describe('when password has multiple missing requirements', () => {
    it('returns false for password missing uppercase and numbers', () => {
      const missingMultiple = 'password!@#';

      const result = validatePassword(missingMultiple);

      expect(result).toBe(false);
    });

    it('returns false for password missing lowercase and special chars', () => {
      const missingMultiple = 'PASSWORD123';

      const result = validatePassword(missingMultiple);

      expect(result).toBe(false);
    });

    it('returns false for password missing numbers and special chars', () => {
      const missingMultiple = 'Password';

      const result = validatePassword(missingMultiple);

      expect(result).toBe(false);
    });

    it('returns false for password with only special characters', () => {
      const onlySpecial = '!@#$%^&*';

      const result = validatePassword(onlySpecial);

      expect(result).toBe(false);
    });

    it('returns false for password with only numbers', () => {
      const onlyNumbers = '12345678';

      const result = validatePassword(onlyNumbers);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns true for password exactly 8 characters with all requirements', () => {
      const exactLength = 'Test123!';

      const result = validatePassword(exactLength);

      expect(result).toBe(true);
    });

    it('returns true for very long password with all requirements', () => {
      const longPassword =
        'ThisIsAVeryLongPasswordWithNumbers123AndSpecialChars!@#$%^&*()';

      const result = validatePassword(longPassword);

      expect(result).toBe(true);
    });

    it('returns false for password with spaces only', () => {
      const spacesOnly = '        ';

      const result = validatePassword(spacesOnly);

      expect(result).toBe(false);
    });

    it('returns true for password with spaces and all requirements', () => {
      const withSpaces = 'My Pass 123!';

      const result = validatePassword(withSpaces);

      expect(result).toBe(true);
    });

    it('handles unicode characters correctly', () => {
      const unicodePassword = 'Pássword123!';

      const result = validatePassword(unicodePassword);

      expect(result).toBe(true);
    });
  });

  describe('boundary testing for special characters', () => {
    const specialCharacters = [
      '!',
      '@',
      '#',
      '$',
      '%',
      '^',
      '&',
      '*',
      '(',
      ')',
      '_',
      '+',
      '-',
      '=',
      '[',
      ']',
      '{',
      '}',
      ';',
      "'",
      ':',
      '"',
      '\\',
      '|',
      ',',
      '.',
      '<',
      '>',
      '/',
      '?',
    ];

    specialCharacters.forEach((char) => {
      it(`returns true for password with special character: ${char}`, () => {
        const passwordWithChar = `Test123${char}`;

        const result = validatePassword(passwordWithChar);

        expect(result).toBe(true);
      });
    });
  });
});
