import {
  callingCodeFromMaskedPhone,
  normalizeMfaEmail,
  toE164Phone,
} from './mfaDestination';

describe('mfaDestination', () => {
  it('returns a trimmed lowercase email', () => {
    expect(normalizeMfaEmail('  Jane.Doe+tag@Example.com ')).toBe(
      'jane.doe+tag@example.com',
    );
  });

  it('rejects an address without a domain dot', () => {
    expect(normalizeMfaEmail('jane@example')).toBeNull();
  });

  it('reads a leading calling code', () => {
    expect(callingCodeFromMaskedPhone('+64 *****1234')).toBe('64');
  });

  it('builds an E.164 phone number', () => {
    expect(toE164Phone('64', '21 123 4567')).toBe('+64211234567');
  });

  it('strips a calling code the user already typed', () => {
    expect(toE164Phone('64', '64211234567')).toBe('+64211234567');
  });

  it('normalizes a calling code that includes a plus sign', () => {
    expect(toE164Phone('+64', '21 123 4567')).toBe('+64211234567');
  });

  it('returns null when the calling code has no digits', () => {
    expect(toE164Phone('', '211234567')).toBeNull();
    expect(toE164Phone('+', '211234567')).toBeNull();
  });
});
