import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import {
  getVbaChoosableCurrencies,
  getVbaCurrencyDisplayName,
  getVbaSourceCurrencyForCountry,
  normalizeVbaCurrencyCode,
  readVbaRouteSourceCurrency,
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

  it('fails closed for an explicit GBP mapping and does not use the USD default', () => {
    expect(
      getVbaSourceCurrencyForCountry('GB', { GB: 'GBP' }, ['GB'], 'USD'),
    ).toBeUndefined();
  });

  it('uses an explicit USD mapping when that currency can be rendered', () => {
    expect(
      getVbaSourceCurrencyForCountry('US', { US: 'USD' }, ['US'], 'GBP'),
    ).toBe('USD');
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

describe('normalizeVbaCurrencyCode', () => {
  it('keeps generic three-letter codes and drops malformed values', () => {
    expect(normalizeVbaCurrencyCode(' gbp ')).toBe('GBP');
    expect(normalizeVbaCurrencyCode('jpy')).toBe('JPY');
    expect(normalizeVbaCurrencyCode('EUR')).toBe('EUR');
    expect(normalizeVbaCurrencyCode('')).toBeUndefined();
    expect(normalizeVbaCurrencyCode('   ')).toBeUndefined();
    expect(normalizeVbaCurrencyCode('US')).toBeUndefined();
    expect(normalizeVbaCurrencyCode('EURO')).toBeUndefined();
    expect(normalizeVbaCurrencyCode('US1')).toBeUndefined();
    expect(normalizeVbaCurrencyCode(1)).toBeUndefined();
    expect(normalizeVbaCurrencyCode(null)).toBeUndefined();
    expect(normalizeVbaCurrencyCode(undefined)).toBeUndefined();
  });
});

describe('readVbaRouteSourceCurrency', () => {
  it('accepts a renderable code and rejects blank, malformed, and unrenderable codes', () => {
    expect(readVbaRouteSourceCurrency(' usd ')).toBe('USD');
    expect(readVbaRouteSourceCurrency('BRL')).toBe('BRL');
    expect(readVbaRouteSourceCurrency('EUR')).toBeUndefined();
    expect(readVbaRouteSourceCurrency('GBP')).toBeUndefined();
    expect(readVbaRouteSourceCurrency('')).toBeUndefined();
    expect(readVbaRouteSourceCurrency('nope')).toBeUndefined();
  });
});

describe('getVbaChoosableCurrencies', () => {
  it('lists deduped LaunchDarkly currencies the client can render', () => {
    expect(
      getVbaChoosableCurrencies(
        { BR: 'BRL', US: 'USD', CA: 'USD', FR: 'EUR', GB: 'GBP' },
        'JPY',
      ),
    ).toEqual(['BRL', 'USD']);
  });

  it('includes a renderable default that is not in the map', () => {
    expect(getVbaChoosableCurrencies({ BR: 'BRL' }, 'USD')).toEqual([
      'BRL',
      'USD',
    ]);
  });

  it('omits currencies that are not configured', () => {
    expect(getVbaChoosableCurrencies({ BR: 'BRL' }, 'BRL')).toEqual(['BRL']);
  });
});

describe('getVbaCurrencyDisplayName', () => {
  it('names a code outside any fixed currency list, or returns the code', () => {
    const name = getVbaCurrencyDisplayName('JPY', 'en');
    expect(name.length).toBeGreaterThan(0);
    expect(name === 'JPY' || name.toLowerCase().includes('yen')).toBe(true);
  });

  it('falls back to the code when Intl.DisplayNames is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames');
    Object.defineProperty(Intl, 'DisplayNames', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(getVbaCurrencyDisplayName('GBP', 'en')).toBe('GBP');
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, 'DisplayNames', descriptor);
      }
    }
  });

  it('names a code when no locale is selected', () => {
    const name = getVbaCurrencyDisplayName('JPY');

    expect(name.length).toBeGreaterThan(0);
    expect(name === 'JPY' || name.toLowerCase().includes('yen')).toBe(true);
  });

  it('returns the code when the currency name is empty', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames');
    class EmptyCurrencyName {
      of(): string {
        return '';
      }
    }
    Object.defineProperty(Intl, 'DisplayNames', {
      configurable: true,
      value: EmptyCurrencyName,
    });

    try {
      expect(getVbaCurrencyDisplayName('GBP', 'en')).toBe('GBP');
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, 'DisplayNames', descriptor);
      }
    }
  });

  it('returns the code when currency naming throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames');
    class ThrowingCurrencyName {
      constructor() {
        throw new Error('unsupported locale');
      }
    }
    Object.defineProperty(Intl, 'DisplayNames', {
      configurable: true,
      value: ThrowingCurrencyName,
    });

    try {
      expect(getVbaCurrencyDisplayName('EUR', 'en')).toBe('EUR');
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, 'DisplayNames', descriptor);
      }
    }
  });
});
