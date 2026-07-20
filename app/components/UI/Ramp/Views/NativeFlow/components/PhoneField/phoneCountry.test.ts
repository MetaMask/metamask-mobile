import type { Country } from '@metamask/ramps-controller';
import {
  findCountryByPhonePrefix,
  getLocalPhoneDigits,
  getPhonePrefixDigits,
} from './phoneCountry';

const makeCountry = (isoCode: string, prefix: string): Country =>
  ({
    isoCode,
    name: isoCode,
    flag: '',
    currency: '',
    supported: { buy: true, sell: true },
    phone: { prefix, placeholder: '', template: '' },
  }) as Country;

const US = makeCountry('US', '+1');
const CA = makeCountry('CA', '+1');
const PT = makeCountry('PT', '+351');
const GB = makeCountry('GB', '+44');
const countries = [US, PT, GB];

describe('getPhonePrefixDigits', () => {
  it('returns the digits-only prefix', () => {
    expect(getPhonePrefixDigits(PT)).toBe('351');
  });

  it('returns an empty string when the country or prefix is missing', () => {
    expect(getPhonePrefixDigits(null)).toBe('');
    expect(getPhonePrefixDigits(makeCountry('XX', ''))).toBe('');
  });
});

describe('getLocalPhoneDigits', () => {
  it('strips the leading country prefix', () => {
    expect(getLocalPhoneDigits('+351912345678', PT)).toBe('912345678');
  });

  it('returns all digits when there is no prefix', () => {
    expect(getLocalPhoneDigits('912345678', null)).toBe('912345678');
  });

  it('only strips a single leading occurrence of the prefix', () => {
    // Local number that itself starts with the prefix digits.
    expect(getLocalPhoneDigits('+3513510000', PT)).toBe('3510000');
  });
});

describe('findCountryByPhonePrefix', () => {
  it('matches the country by dialing prefix', () => {
    expect(findCountryByPhonePrefix(countries, '+447123456789')).toBe(GB);
  });

  it('prefers the longest matching prefix', () => {
    // '+351...' must resolve to PT (351), not be shadowed by a shorter code.
    expect(findCountryByPhonePrefix(countries, '+351912345678')).toBe(PT);
  });

  it('returns null when nothing matches or the number is empty', () => {
    expect(findCountryByPhonePrefix(countries, '')).toBeNull();
    expect(findCountryByPhonePrefix(countries, undefined)).toBeNull();
    expect(findCountryByPhonePrefix(countries, '+9990000')).toBeNull();
  });

  it('prefers the fallback country when several share a dialing code', () => {
    // US and CA both use +1; the fallback breaks the tie either way.
    const sharedCode = [US, CA];
    expect(findCountryByPhonePrefix(sharedCode, '+15551234567', CA)).toBe(CA);
    expect(findCountryByPhonePrefix(sharedCode, '+15551234567', US)).toBe(US);
  });

  it('falls back to the first match when the fallback does not share the code', () => {
    const sharedCode = [US, CA];
    // GB is not a +1 country, so the first tied match wins.
    expect(findCountryByPhonePrefix(sharedCode, '+15551234567', GB)).toBe(US);
    expect(findCountryByPhonePrefix(sharedCode, '+15551234567')).toBe(US);
  });

  it('ignores the fallback when a more specific prefix matches', () => {
    // '+351...' must still resolve to PT even if a shorter-code fallback is set.
    expect(findCountryByPhonePrefix(countries, '+351912345678', US)).toBe(PT);
  });
});
