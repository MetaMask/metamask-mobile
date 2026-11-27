import { isMfaForceDisabled } from './isMfaForceDisabled';

describe('isMfaForceDisabled', () => {
  it('returns true when the build sets the flag to "true"', () => {
    expect(isMfaForceDisabled('true')).toBe(true);
  });

  it.each(['false', 'TRUE', '1', ''])(
    'returns false for the non-matching value %p',
    (value) => {
      expect(isMfaForceDisabled(value)).toBe(false);
    },
  );

  it('returns false when the flag is unset', () => {
    expect(isMfaForceDisabled(undefined)).toBe(false);
  });

  it('is disabled in the unit test build', () => {
    expect(isMfaForceDisabled()).toBe(false);
  });
});
