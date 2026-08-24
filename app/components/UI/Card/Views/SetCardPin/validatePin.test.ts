import { validateCardPin } from './validatePin';

describe('validateCardPin', () => {
  it('accepts a valid 4-digit PIN', () => {
    expect(validateCardPin('1337')).toStrictEqual({ valid: true });
  });

  it('rejects PINs that are not exactly 4 characters', () => {
    expect(validateCardPin('123')).toStrictEqual({
      valid: false,
      reason: 'length',
    });
    expect(validateCardPin('12345')).toStrictEqual({
      valid: false,
      reason: 'length',
    });
  });

  it('rejects non-digit characters', () => {
    expect(validateCardPin('12ab')).toStrictEqual({
      valid: false,
      reason: 'digits',
    });
  });

  it.each([
    '0000',
    '1111',
    '2222',
    '3333',
    '4444',
    '5555',
    '6666',
    '7777',
    '8888',
    '9999',
  ])('rejects repeating PIN %s', (pin) => {
    expect(validateCardPin(pin)).toStrictEqual({
      valid: false,
      reason: 'repeating',
    });
  });
});
