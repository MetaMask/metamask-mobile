import type { Quote } from '@metamask/ramps-controller';
import {
  getCheckoutContext,
  getWidgetRedirectConfig,
} from './buildQuoteWithRedirectUrl';

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

describe('getWidgetRedirectConfig', () => {
  const externalBrowserQuote = {
    quote: {
      buyWidget: {
        browser: 'IN_APP_OS_BROWSER',
      },
    },
  } as unknown as Quote;

  it('builds the same deeplink for prefixed and stripped provider ids', () => {
    const prefixed = getWidgetRedirectConfig(
      externalBrowserQuote,
      '/providers/moonpay',
      true,
    );
    const stripped = getWidgetRedirectConfig(
      externalBrowserQuote,
      'moonpay',
      true,
    );

    expect(prefixed.useExternalBrowser).toBe(true);
    expect(stripped.useExternalBrowser).toBe(true);
    expect(prefixed.redirectUrl).toBe('metamask://on-ramp/providers/moonpay');
    expect(stripped.redirectUrl).toBe('metamask://on-ramp/providers/moonpay');
  });
});
