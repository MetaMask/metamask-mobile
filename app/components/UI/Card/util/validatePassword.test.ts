import { validatePassword } from './validatePassword';

describe('validatePassword', () => {
  describe('minimum length requirement', () => {
    it('returns false for password with 14 characters', () => {
      const shortPassword = 'MyPass123!@#$%';

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

    it('returns true for password with exactly 15 characters', () => {
      const minLengthPassword = 'MyPass123!@#$%^';

      const result = validatePassword(minLengthPassword);

      expect(result).toBe(true);
    });

    it('returns true for password with more than 15 characters', () => {
      const longerPassword = 'MyPassword123!@#$%';

      const result = validatePassword(longerPassword);

      expect(result).toBe(true);
    });
  });

  describe('non-printable characters', () => {
    it('returns false for password with null character', () => {
      const nullCharPassword = 'MyPassword123!@\u0000';

      const result = validatePassword(nullCharPassword);

      expect(result).toBe(false);
    });

    it('returns false for password with control character', () => {
      const controlCharPassword = 'MyPassword123!@\u0001';

      const result = validatePassword(controlCharPassword);

      expect(result).toBe(false);
    });

    it('returns false for password with DEL character', () => {
      const delCharPassword = 'MyPassword123!@\u007F';

      const result = validatePassword(delCharPassword);

      expect(result).toBe(false);
    });
  });

  describe('consecutive spaces', () => {
    it('returns false for password with consecutive spaces', () => {
      const consecutiveSpaces = 'MyPassword123!@  ';

      const result = validatePassword(consecutiveSpaces);

      expect(result).toBe(false);
    });

    it('returns false for password with multiple consecutive spaces', () => {
      const multipleSpaces = 'MyPassword123!@   ';

      const result = validatePassword(multipleSpaces);

      expect(result).toBe(false);
    });

    it('returns true for password with single spaces between words', () => {
      const singleSpaces = 'My Password 123 ABC';

      const result = validatePassword(singleSpaces);

      expect(result).toBe(true);
    });
  });

  describe('valid passwords', () => {
    it('returns true for valid password with 15 printable characters', () => {
      const validPassword = 'ValidPass123!@#';

      const result = validatePassword(validPassword);

      expect(result).toBe(true);
    });

    it('returns true for valid password with special characters', () => {
      const validPassword = 'MyPass123!@#$%^';

      const result = validatePassword(validPassword);

      expect(result).toBe(true);
    });

    it('returns true for very long password', () => {
      const longPassword =
        'ThisIsAVeryLongPasswordWithNumbers123AndSpecialChars!@#$%^&*()';

      const result = validatePassword(longPassword);

      expect(result).toBe(true);
    });

    it('returns true for password with unicode characters', () => {
      const unicodePassword = 'Pássword123!@#$';

      const result = validatePassword(unicodePassword);

      expect(result).toBe(true);
    });

    it('returns true for password with single spaces', () => {
      const withSpaces = 'My Pass Word 123!';

      const result = validatePassword(withSpaces);

      expect(result).toBe(true);
    });

    it('returns true for password with numbers only (if 15+ chars)', () => {
      const numbersOnly = '123456789012345';

      const result = validatePassword(numbersOnly);

      expect(result).toBe(true);
    });

    it('returns true for password with letters only (if 15+ chars)', () => {
      const lettersOnly = 'abcdefghijklmno';

      const result = validatePassword(lettersOnly);

      expect(result).toBe(true);
    });

    it('returns true for password with special characters only (if 15+ chars)', () => {
      const specialOnly = '!@#$%^&*()_+-=.';

      const result = validatePassword(specialOnly);

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
      it(`returns true for 15-character password with special character: ${char}`, () => {
        const passwordWithChar = `Test12345ABCDE${char}`;

        const result = validatePassword(passwordWithChar);

        expect(result).toBe(true);
      });
    });
  });
});
