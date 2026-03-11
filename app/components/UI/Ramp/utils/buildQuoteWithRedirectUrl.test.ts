import {
  buildQuoteWithRedirectUrl,
  getAggregatorRedirectUrl,
  getCheckoutContext,
} from './buildQuoteWithRedirectUrl';

jest.mock('./getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: () =>
    'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
}));

describe('buildQuoteWithRedirectUrl', () => {
  it('returns quote unchanged when buyURL is missing', () => {
    const quote = { provider: 'test', quote: { amountIn: 100 } };
    const result = buildQuoteWithRedirectUrl(
      quote as Parameters<typeof buildQuoteWithRedirectUrl>[0],
      'https://example.com/callback',
    );
    expect(result).toEqual(quote);
  });

  it('rewrites buyURL with redirectUrl param', () => {
    const quote = {
      provider: 'test',
      quote: {
        amountIn: 100,
        buyURL: 'https://pay.example.com/buy?amount=100',
      },
    };
    const result = buildQuoteWithRedirectUrl(
      quote as Parameters<typeof buildQuoteWithRedirectUrl>[0],
      'https://app.example.com/callback',
    );
    const url = new URL(result.quote?.buyURL ?? '');
    expect(url.searchParams.get('redirectUrl')).toBe(
      'https://app.example.com/callback',
    );
  });

  it('preserves other quote fields', () => {
    const quote = {
      provider: 'test',
      quote: {
        amountIn: 100,
        amountOut: 0.05,
        buyURL: 'https://pay.example.com/buy',
      },
    };
    const result = buildQuoteWithRedirectUrl(
      quote as Parameters<typeof buildQuoteWithRedirectUrl>[0],
      'https://callback.com',
    );
    expect(result.quote?.amountIn).toBe(100);
    expect(result.quote?.amountOut).toBe(0.05);
  });
});

describe('getAggregatorRedirectUrl', () => {
  it('returns deeplink when quote indicates IN_APP_OS_BROWSER', () => {
    const quote = {
      provider: 'paypal',
      quote: {
        buyWidget: { browser: 'IN_APP_OS_BROWSER' },
      },
    };
    const result = getAggregatorRedirectUrl(
      quote as Parameters<typeof getAggregatorRedirectUrl>[0],
      'paypal',
    );
    expect(result).toBe('metamask://on-ramp/providers/paypal');
  });

  it('returns callbackBaseUrl when quote does not indicate external browser', () => {
    const quote = {
      provider: 'moonpay',
      quote: { buyWidget: { browser: 'APP_BROWSER' } },
    };
    const result = getAggregatorRedirectUrl(
      quote as Parameters<typeof getAggregatorRedirectUrl>[0],
      'moonpay',
    );
    expect(result).toContain('on-ramp-content');
    expect(result).toContain('fake-callback');
  });

  it('returns callbackBaseUrl when buyWidget or browser is missing', () => {
    const quote = { provider: 'test', quote: {} };
    const result = getAggregatorRedirectUrl(
      quote as Parameters<typeof getAggregatorRedirectUrl>[0],
      'test',
    );
    expect(result).toContain('on-ramp-content');
  });
});

describe('getCheckoutContext', () => {
  it('extracts network from CAIP chainId', () => {
    const result = getCheckoutContext(
      { chainId: 'eip155:1' },
      '0x123',
      'order-1',
    );
    expect(result.network).toBe('1');
    expect(result.effectiveWallet).toBe('0x123');
    expect(result.effectiveOrderId).toBe('order-1');
  });

  it('uses chainId as network when no colon present', () => {
    const result = getCheckoutContext({ chainId: '1' }, '0x123', null);
    expect(result.network).toBe('1');
  });

  it('defaults effectiveWallet to empty string when null or undefined', () => {
    expect(
      getCheckoutContext({ chainId: '1' }, null, undefined).effectiveWallet,
    ).toBe('');
    expect(
      getCheckoutContext({ chainId: '1' }, undefined, null).effectiveWallet,
    ).toBe('');
  });

  it('trims and nullifies empty orderId', () => {
    expect(
      getCheckoutContext({ chainId: '1' }, '0x', '  ').effectiveOrderId,
    ).toBeNull();
    expect(
      getCheckoutContext({ chainId: '1' }, '0x', '  ok  ').effectiveOrderId,
    ).toBe('ok');
  });

  it('handles null selectedToken', () => {
    const result = getCheckoutContext(null, '0x123', 'ord');
    expect(result.network).toBe('');
    expect(result.effectiveWallet).toBe('0x123');
    expect(result.effectiveOrderId).toBe('ord');
  });
});
