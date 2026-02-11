import {
  getQuoteProviderName,
  isNativeProvider,
  type Quote,
} from './index';

describe('getQuoteProviderName', () => {
  it('returns providerInfo.name when present (canonical display name)', () => {
    const quote: Quote = {
      provider: '/providers/ramp-network',
      providerInfo: {
        id: '/providers/ramp-network',
        name: 'Ramp Network',
        type: 'aggregator',
      },
    } as Quote;

    expect(getQuoteProviderName(quote)).toBe('Ramp Network');
  });

  it('returns "Provider" when providerInfo is missing', () => {
    const quote = { provider: '/providers/mercuryo' } as Quote;

    expect(getQuoteProviderName(quote)).toBe('Provider');
  });

  it('returns "Provider" when providerInfo.name is missing', () => {
    const quote = {
      provider: '/providers/transak',
      providerInfo: { id: '/providers/transak', name: '', type: 'aggregator' },
    } as Quote;

    expect(getQuoteProviderName(quote)).toBe('Provider');
  });

  it('uses providerInfo.name not quote.provider path (avoids slug as title)', () => {
    const quote: Quote = {
      provider: '/providers/ramp-network',
      providerInfo: {
        id: '/providers/ramp-network',
        name: 'Ramp Network',
        type: 'aggregator',
      },
    } as Quote;

    const name = getQuoteProviderName(quote);
    expect(name).toBe('Ramp Network');
    expect(name).not.toBe('ramp-network');
    expect(name).not.toContain('/');
  });
});

describe('isNativeProvider', () => {
  it('returns true when providerInfo.type is "native"', () => {
    const quote: Quote = {
      provider: '/providers/transak-native',
      providerInfo: {
        id: '/providers/transak-native',
        name: 'Transak Native',
        type: 'native',
      },
    } as Quote;

    expect(isNativeProvider(quote)).toBe(true);
  });

  it('returns false when providerInfo.type is "aggregator"', () => {
    const quote: Quote = {
      provider: '/providers/transak',
      providerInfo: {
        id: '/providers/transak',
        name: 'Transak',
        type: 'aggregator',
      },
    } as Quote;

    expect(isNativeProvider(quote)).toBe(false);
  });
});
