import { getCapitalizedString } from './strings';

describe('getCapitalizedString', () => {
  const lowercaseString = 'thisisateststring';
  const lowercaseStringWithSpaces = 'this is a test string';
  const uppercaseString = 'THISISATESTSTRING';
  const uppercaseStringWithSpaces = 'THIS IS A TEST STRING';

  const capitalizedString = 'Thisisateststring';
  const capitalizedStringWithSpaces = 'This is a test string';
  it('should capitalize a lowercase string without spaces', () =>
    expect(getCapitalizedString(lowercaseString)).toBe(capitalizedString));
  it('should capitalize a lowercase string with spaces', () =>
    expect(getCapitalizedString(lowercaseStringWithSpaces)).toBe(
      capitalizedStringWithSpaces,
    ));
  it('should capitalize a UPPERCASE string without spaces', () =>
    expect(getCapitalizedString(uppercaseString)).toBe(capitalizedString));
  it('should capitalize a UPPERCASE string with spaces', () =>
    expect(getCapitalizedString(uppercaseStringWithSpaces)).toBe(
      capitalizedStringWithSpaces,
    ));
});
