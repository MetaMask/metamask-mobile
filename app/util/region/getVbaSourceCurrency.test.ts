import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import {
  getVbaSourceCurrencyForCountry,
  isVbaSourceCurrency,
} from './getVbaSourceCurrency';

describe('getVbaSourceCurrencyForCountry', () => {
  it.each([
    ['BR', 'BRL'],
    ['br-sp', 'BRL'],
  ])('maps %s to %s', (location, expected) => {
    expect(getVbaSourceCurrencyForCountry(location)).toBe(expected);
  });

  it('keeps US on BRL until USD deposit details can be shown', () => {
    expect(getVbaSourceCurrencyForCountry('US-CA')).toBe('BRL');
  });

  it.each(['DE', 'FR-75', '', UNKNOWN_LOCATION, undefined, null])(
    'returns undefined for %p',
    (location) => {
      expect(getVbaSourceCurrencyForCountry(location)).toBeUndefined();
    },
  );
});

describe('isVbaSourceCurrency', () => {
  it('accepts BRL, USD, and EUR only', () => {
    expect(['BRL', 'USD', 'EUR'].every(isVbaSourceCurrency)).toBe(true);
    expect(isVbaSourceCurrency('GBP')).toBe(false);
    expect(isVbaSourceCurrency(undefined)).toBe(false);
  });
});
