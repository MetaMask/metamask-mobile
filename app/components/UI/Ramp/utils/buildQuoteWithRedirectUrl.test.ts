import type { Quote } from '@metamask/ramps-controller';
import {
  getCheckoutContext,
  getAggregatorRedirectConfig,
  getWidgetRedirectConfig,
} from './buildQuoteWithRedirectUrl';

jest.mock('./getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: () => 'https://callback.example/base',
}));

const makeQuote = (browser?: 'APP_BROWSER' | 'IN_APP_OS_BROWSER'): Quote =>
  ({
    quote: browser ? { buyWidget: { browser } } : {},
  }) as unknown as Quote;

describe('getCheckoutContext', () => {
  describe('network from chainId', () => {
    it('extracts network as part after colon when chainId contains colon', () => {
      const result = getCheckoutContext({ chainId: 'eip155:1' }, '0xabc', null);

      expect(result.network).toBe('1');
    });

    it('uses full chainId as network when chainId has no colon', () => {
      const result = getCheckoutContext({ chainId: '0x1' }, '0xabc', null);

      expect(result.network).toBe('0x1');
    });

    it('returns empty network when chainId is undefined', () => {
      const result = getCheckoutContext(null, '0xabc', null);

      expect(result.network).toBe('');
    });

    it('returns empty network when chainId ends with colon and no suffix', () => {
      const result = getCheckoutContext({ chainId: 'eip155:' }, '0xabc', null);

      expect(result.network).toBe('');
    });
  });
});

describe('getAggregatorRedirectConfig (Phase 1 in-app vs external predicate)', () => {
  it('classifies a quote with no buyWidget.browser as in-app (Checkout WebView callback base)', () => {
    const result = getAggregatorRedirectConfig(makeQuote(), 'moonpay');

    expect(result.useExternalBrowser).toBe(false);
    expect(result.redirectUrl).toBe('https://callback.example/base');
  });

  it('classifies APP_BROWSER as in-app', () => {
    const result = getAggregatorRedirectConfig(
      makeQuote('APP_BROWSER'),
      'moonpay',
    );

    expect(result.useExternalBrowser).toBe(false);
    expect(result.redirectUrl).toBe('https://callback.example/base');
  });

  it('classifies IN_APP_OS_BROWSER as external (provider deeplink)', () => {
    const result = getAggregatorRedirectConfig(
      makeQuote('IN_APP_OS_BROWSER'),
      'coinbase',
    );

    expect(result.useExternalBrowser).toBe(true);
    expect(result.redirectUrl).toBe('metamask://on-ramp/providers/coinbase');
  });
});

describe('getWidgetRedirectConfig', () => {
  it('routes a custom action to the external provider deeplink regardless of browser', () => {
    const result = getWidgetRedirectConfig(makeQuote(), 'paypal', true);

    expect(result.useExternalBrowser).toBe(true);
    expect(result.redirectUrl).toBe('metamask://on-ramp/providers/paypal');
  });

  it('delegates a non-custom aggregator quote to the aggregator config (in-app)', () => {
    const result = getWidgetRedirectConfig(
      makeQuote('APP_BROWSER'),
      'moonpay',
      false,
    );

    expect(result.useExternalBrowser).toBe(false);
    expect(result.redirectUrl).toBe('https://callback.example/base');
  });
});
