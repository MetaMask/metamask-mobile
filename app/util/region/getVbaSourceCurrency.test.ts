import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import {
  getVbaSourceCurrencyForCountry,
  isVbaSourceCurrency,
} from './getVbaSourceCurrency';

describe('getVbaSourceCurrencyForCountry', () => {
  const regionCurrencies = { BR: 'BRL', US: 'USD', FR: 'EUR' } as const;

  it.each([
    ['BR', 'BRL'],
    ['br-sp', 'BRL'],
  ])('maps %s to %s', (location, expected) => {
    expect(getVbaSourceCurrencyForCountry(location, regionCurrencies)).toBe(
      expected,
    );
  });

  it('maps the US to USD', () => {
    expect(getVbaSourceCurrencyForCountry('US-CA', regionCurrencies)).toBe(
      'USD',
    );
  });

  it('fails closed when the flag does not map the country', () => {
    expect(
      getVbaSourceCurrencyForCountry('US-CA', { BR: 'BRL' }),
    ).toBeUndefined();
  });

  it('fails closed when the mapped currency has no details layout', () => {
    expect(
      getVbaSourceCurrencyForCountry('FR', regionCurrencies),
    ).toBeUndefined();
  });

  it.each(['DE', 'FR-75', '', UNKNOWN_LOCATION, undefined, null])(
    'returns undefined for %p',
    (location) => {
      expect(
        getVbaSourceCurrencyForCountry(location, regionCurrencies),
      ).toBeUndefined();
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
