import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import {
  getVbaMarketForCountry,
  isVbaSourceCurrency,
  type VbaMarket,
} from './getVbaSourceCurrency';

const brl: VbaMarket = { currency: 'BRL', regions: ['BR'] };
const usd: VbaMarket = { currency: 'USD', regions: ['US'] };

describe('getVbaMarketForCountry', () => {
  it('returns the open market listing the country of the location', () => {
    expect(getVbaMarketForCountry([brl, usd], ' br-sp ')).toBe(brl);
    expect(getVbaMarketForCountry([brl, usd], 'US-CA')).toBe(usd);
  });

  it.each([['DE'], [UNKNOWN_LOCATION], [''], [undefined], [null]])(
    'returns undefined for %s',
    (location) => {
      expect(getVbaMarketForCountry([brl, usd], location)).toBeUndefined();
    },
  );

  it('returns undefined when no market is open', () => {
    expect(getVbaMarketForCountry([], 'BR')).toBeUndefined();
  });
});

describe('isVbaSourceCurrency', () => {
  it('accepts BRL and USD only', () => {
    expect(isVbaSourceCurrency('BRL')).toBe(true);
    expect(isVbaSourceCurrency('USD')).toBe(true);
    expect(isVbaSourceCurrency('EUR')).toBe(false);
    expect(isVbaSourceCurrency('brl')).toBe(false);
    expect(isVbaSourceCurrency(undefined)).toBe(false);
  });
});
