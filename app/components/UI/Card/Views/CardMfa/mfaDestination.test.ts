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
});
