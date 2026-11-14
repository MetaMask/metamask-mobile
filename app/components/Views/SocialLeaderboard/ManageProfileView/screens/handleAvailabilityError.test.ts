import { strings } from '../../../../../../locales/i18n';
import {
  getHandleAvailabilityError,
  getHandleAvailabilityRejection,
  getHandleLocalRuleError,
  isInvalidFormatHandle,
  isReservedHandle,
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
const RESERVED = strings('social_leaderboard.manage_profile.username_reserved');

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

  it('reports a reserved handle as reserved', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [{ code: 'RESERVED', message: 'Reserved' }],
        }),
      ),
    ).toBe(RESERVED);
  });

  it('reports a reserved handle from the error-catalogue code', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [
            { code: 'USERNAME_RESERVED', message: 'This username is reserved' },
          ],
        }),
      ),
    ).toBe(RESERVED);
  });

  it('reports the character rule from the error-catalogue code', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [
            {
              code: 'USERNAME_INVALID_FORMAT',
              message: 'This username has invalid characters',
            },
          ],
        }),
      ),
    ).toBe(INVALID);
  });

  it('prefers the reserved copy when the server reports reserved and taken', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          available: false,
          errors: [
            { code: 'TAKEN', message: 'Already taken' },
            { code: 'RESERVED', message: 'Reserved' },
          ],
        }),
      ),
    ).toBe(RESERVED);
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

  it('reports the character rule when the catalogue code arrives with valid true', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          valid: true,
          available: false,
          errors: [
            {
              code: 'USERNAME_INVALID_FORMAT',
              message: 'This username has invalid characters',
            },
          ],
        }),
      ),
    ).toBe(INVALID);
  });

  it('reports the character rule when the short code arrives with valid true', () => {
    expect(
      getHandleAvailabilityError(
        availability({
          valid: true,
          available: false,
          errors: [{ code: 'INVALID_FORMAT', message: 'Bad format' }],
        }),
      ),
    ).toBe(INVALID);
  });
});

describe('getHandleAvailabilityRejection', () => {
  it('accepts a handle the server allows', () => {
    expect(getHandleAvailabilityRejection(availability())).toBeNull();
  });

  it('classifies a validity refusal as a format problem', () => {
    expect(
      getHandleAvailabilityRejection(
        availability({ valid: false, available: false }),
      ),
    ).toBe('invalidFormat');
  });

  it('classifies a catalogue format refusal even when valid is true', () => {
    expect(
      getHandleAvailabilityRejection(
        availability({
          valid: true,
          available: false,
          errors: [{ code: 'USERNAME_INVALID_FORMAT', message: 'Bad format' }],
        }),
      ),
    ).toBe('invalidFormat');
  });

  it('classifies reserved before unavailable', () => {
    expect(
      getHandleAvailabilityRejection(
        availability({
          available: false,
          errors: [
            { code: 'USERNAME_TAKEN', message: 'Taken' },
            { code: 'RESERVED', message: 'Reserved' },
          ],
        }),
      ),
    ).toBe('reserved');
  });

  it('classifies an unknown refusal as unavailable', () => {
    expect(
      getHandleAvailabilityRejection(
        availability({ available: false, errors: [] }),
      ),
    ).toBe('unavailable');
  });

  it('exposes the format and reserved predicates it builds on', () => {
    expect(
      isInvalidFormatHandle(
        availability({
          valid: true,
          available: false,
          errors: [{ code: 'INVALID_FORMAT', message: 'Bad format' }],
        }),
      ),
    ).toBe(true);
    expect(
      isReservedHandle(
        availability({
          available: false,
          errors: [{ code: 'USERNAME_RESERVED', message: 'Reserved' }],
        }),
      ),
    ).toBe(true);
  });
});
