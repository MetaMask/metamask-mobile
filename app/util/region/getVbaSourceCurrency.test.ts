import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import {
  getVbaSourceCurrencyForCountry,
  isVbaSourceCurrency,
} from './getVbaSourceCurrency';

describe('getVbaSourceCurrencyForCountry', () => {
  const regions = ['BR', 'US', 'FR', 'DE'];
  const regionCurrencies = { BR: 'BRL', US: 'USD', FR: 'EUR' } as const;

  it.each([
    ['BR', 'BRL'],
    ['br-sp', 'BRL'],
  ])('maps %s to %s', (location, expected) => {
    expect(
      getVbaSourceCurrencyForCountry(location, regionCurrencies, regions),
    ).toBe(expected);
  });

  it('maps the US to USD', () => {
    expect(
      getVbaSourceCurrencyForCountry('US-CA', regionCurrencies, regions),
    ).toBe('USD');
  });

  it('fails closed when the flag does not map the country and there is no default', () => {
    expect(
      getVbaSourceCurrencyForCountry('US-CA', { BR: 'BRL' }, ['BR', 'US']),
    ).toBeUndefined();
  });

  it('uses defaultCurrency when the country is in regions but not mapped', () => {
    expect(getVbaSourceCurrencyForCountry('br', {}, ['BR', 'US'], 'USD')).toBe(
      'USD',
    );
    expect(
      getVbaSourceCurrencyForCountry('US', { BR: 'BRL' }, ['BR', 'US'], 'USD'),
    ).toBe('USD');
  });

  it('does not use the default when the country is absent from regions', () => {
    expect(
      getVbaSourceCurrencyForCountry('US', { BR: 'BRL' }, ['BR'], 'USD'),
    ).toBeUndefined();
  });

  it('prefers an explicit mapping over the default', () => {
    expect(
      getVbaSourceCurrencyForCountry('BR', { BR: 'BRL' }, ['BR', 'US'], 'USD'),
    ).toBe('BRL');
  });

  it('does not fall through from an explicit EUR mapping to the USD default', () => {
    expect(
      getVbaSourceCurrencyForCountry('FR', { FR: 'EUR' }, ['FR'], 'USD'),
    ).toBeUndefined();
  });

  it('fails closed when the default currency has no details layout', () => {
    expect(
      getVbaSourceCurrencyForCountry('US', {}, ['US'], 'EUR'),
    ).toBeUndefined();
  });

  it('fails closed when the mapped currency has no details layout', () => {
    expect(
      getVbaSourceCurrencyForCountry('FR', regionCurrencies, regions),
    ).toBeUndefined();
  });

  it.each(['DE', 'FR-75', '', UNKNOWN_LOCATION, undefined, null])(
    'returns undefined for %p',
    (location) => {
      expect(
        getVbaSourceCurrencyForCountry(location, regionCurrencies, regions),
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
