import { strings } from '../../../../../../locales/i18n';
import {
  getHandleAvailabilityError,
  getHandleLocalRuleError,
} from './handleAvailabilityError';

const TOO_SHORT = strings(
  'social_leaderboard.manage_profile.username_too_short',
  { min: 3 },
);
const TOO_LONG = strings(
  'social_leaderboard.manage_profile.username_too_long',
  {
    max: 16,
  },
);
const INVALID = strings('social_leaderboard.manage_profile.username_invalid');
const UNAVAILABLE = strings(
  'social_leaderboard.manage_profile.username_unavailable',
);

const availability = (
  overrides: Partial<{
    available: boolean;
    valid: boolean;
    errors: { code: string; message: string }[];
  }> = {},
) => ({
  username: 'wen_cat',
  normalized: 'wen_cat',
  available: true,
  valid: true,
  errors: [],
  ...overrides,
});

describe('getHandleLocalRuleError', () => {
  it('asks for the minimum length for a handle that is empty or too short', () => {
    expect(getHandleLocalRuleError('')).toBe(TOO_SHORT);
    expect(getHandleLocalRuleError('ab')).toBe(TOO_SHORT);
  });

  it('asks for the maximum length for a handle that is too long', () => {
    expect(getHandleLocalRuleError('abcdefghijklmnopq')).toBe(TOO_LONG);
    expect(getHandleLocalRuleError('a'.repeat(16))).toBeNull();
  });

  it('asks for the allowed characters when the handle breaks the charset', () => {
    expect(getHandleLocalRuleError('bad-name')).toBe(INVALID);
    expect(getHandleLocalRuleError('bad name')).toBe(INVALID);
  });

  it('stays quiet for a handle that can be checked with the server', () => {
    expect(getHandleLocalRuleError('wen_cat')).toBeNull();
    expect(getHandleLocalRuleError('hello_')).toBeNull();
  });
});

describe('getHandleAvailabilityError', () => {
  it('reports nothing for a handle the server accepts', () => {
    expect(getHandleAvailabilityError(availability())).toBeNull();
  });

  it('reports the character rule for an invalid format', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          valid: false,
          available: false,
          errors: [{ code: 'INVALID_FORMAT', message: 'Bad format' }],
        }),
      ),
    ).toBe(INVALID);
  });

  it('reports unavailable for a handle that is taken', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [{ code: 'TAKEN', message: 'Already taken' }],
        }),
      ),
    ).toBe(UNAVAILABLE);
  });

  it('reports unavailable for a reserved handle', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [{ code: 'RESERVED', message: 'Reserved' }],
        }),
      ),
    ).toBe(UNAVAILABLE);
  });

  it('prefers a format error when the server reports several', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [
            { code: 'TAKEN', message: 'Already taken' },
            { code: 'INVALID_FORMAT', message: 'Bad format' },
          ],
        }),
      ),
    ).toBe(INVALID);
  });

  it('falls back to the character rule when an invalid handle carries no code', () => {
    expect(
      getHandleAvailabilityError(
        availability({ valid: false, available: false }),
      ),
    ).toBe(INVALID);
  });
});
