import { getPasswordStrength, passwordRequirementsMet } from '.';

describe('getPasswordStrength', () => {
  it('returns "weak" for passwords with less than 8 characters', () => {
    expect(getPasswordStrength('abc')).toBe('weak');
    expect(getPasswordStrength('1234567')).toBe('weak');
  });

  it('returns "weak" for passwords with only lowercase letters', () => {
    expect(getPasswordStrength('abcdefgh')).toBe('weak');
  });

  it('returns "weak" for passwords with only uppercase letters', () => {
    expect(getPasswordStrength('ABCDEFGH')).toBe('weak');
  });

  it('returns "weak" for passwords with only numbers', () => {
    expect(getPasswordStrength('12345678')).toBe('weak');
  });

  it('returns "weak" for passwords with only special characters', () => {
    expect(getPasswordStrength('!@#$%^&*')).toBe('weak');
  });

  it('returns "good" for passwords with a mix of two criteria', () => {
    expect(getPasswordStrength('abcdEFGH')).toBe('good');
    expect(getPasswordStrength('abcd1234')).toBe('good');
    expect(getPasswordStrength('abcd!@#$')).toBe('good');
    expect(getPasswordStrength('ABCD1234')).toBe('good');
    expect(getPasswordStrength('ABCD!@#$')).toBe('good');
    expect(getPasswordStrength('1234!@#$')).toBe('good');
  });

  it('returns "good" for passwords with a mix of three criteria', () => {
    expect(getPasswordStrength('abcdEF12')).toBe('good');
    expect(getPasswordStrength('abcdEF!@')).toBe('good');
    expect(getPasswordStrength('abcd12!@')).toBe('good');
    expect(getPasswordStrength('ABCD12!@')).toBe('good');
  });

  it('returns "strong" for passwords with a mix of all four criteria', () => {
    expect(getPasswordStrength('abcdEF12!@')).toBe('strong');
    expect(getPasswordStrength('ABcd12!@')).toBe('strong');
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
