import {
  isRampCacheHost,
  isRampTranslateUrl,
  isTransakGatewayUrl,
  rampUrl,
  RAMP_TOKEN_ICON_URL,
} from './ramps-hosts';

describe('rampUrl', () => {
  const countries = rampUrl(
    'on-ramp-cache',
    String.raw`/v2/regions/countries\?.*$`,
  );
  const providers = rampUrl(
    'on-ramp-cache',
    String.raw`/v2/regions/[^/]+/providers\?.*$`,
  );
  const topTokens = rampUrl(
    'on-ramp-cache',
    String.raw`/v2/regions/[^/]+/topTokens\?.*$`,
  );
  const networks = rampUrl('on-ramp-cache', String.raw`/regions/networks\?.*$`);
  const payments = rampUrl(
    'on-ramp-cache',
    String.raw`/v2/regions/[^/]+/payments\?.*$`,
  );
  const quotes = rampUrl('on-ramp', String.raw`/v2/quotes\?.*$`);
  const buy = rampUrl('on-ramp', String.raw`/v2/providers/[^/]+/buy(\?.*)?$`);
  const callback = rampUrl(
    'on-ramp-content',
    String.raw`/regions/fake-callback(\?.*)?$`,
  );

  it.each([
    [
      'countries',
      countries,
      'https://on-ramp-cache.api.cx.metamask.io/v2/regions/countries?sdk=2.1.6',
    ],
    [
      'providers',
      providers,
      'https://on-ramp-cache.api.cx.metamask.io/v2/regions/us-ca/providers?sdk=2.1.6',
    ],
    [
      'top tokens',
      topTokens,
      'https://on-ramp-cache.api.cx.metamask.io/v2/regions/us-ca/topTokens?action=buy',
    ],
    [
      'networks',
      networks,
      'https://on-ramp-cache.api.cx.metamask.io/regions/networks?sdk=2.1.12&keys=',
    ],
    [
      'payments',
      payments,
      'https://on-ramp-cache.api.cx.metamask.io/v2/regions/us-ca/payments?provider=topper',
    ],
    [
      'quotes',
      quotes,
      'https://on-ramp.api.cx.metamask.io/v2/quotes?action=buy&redirectUrl=https%3A%2F%2Fon-ramp-content.api.cx.metamask.io%2Fregions%2Ffake-callback',
    ],
    [
      'buy',
      buy,
      'https://on-ramp.api.cx.metamask.io/v2/providers/transak-staging/buy',
    ],
    [
      'callback',
      callback,
      'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback?orderId=mock-order-123',
    ],
  ] as const)('matches production %s', (_label, pattern, url) => {
    expect(pattern.test(url)).toBe(true);
  });

  it('still matches the UAT host', () => {
    expect(
      quotes.test(
        'https://on-ramp.uat-api.cx.metamask.io/v2/quotes?action=buy',
      ),
    ).toBe(true);
  });

  it('does not match the dev host', () => {
    expect(
      quotes.test(
        'https://on-ramp.dev-api.cx.metamask.io/v2/quotes?action=buy',
      ),
    ).toBe(false);
  });
});

describe('isRampCacheHost', () => {
  it('accepts production and UAT cache hosts', () => {
    expect(isRampCacheHost('on-ramp-cache.api.cx.metamask.io')).toBe(true);
    expect(isRampCacheHost('on-ramp-cache.uat-api.cx.metamask.io')).toBe(true);
  });
});

describe('isRampTranslateUrl', () => {
  it('accepts production and UAT translate URLs', () => {
    expect(
      isRampTranslateUrl(
        'https://on-ramp.api.cx.metamask.io/providers/transak-native-staging/native/translate',
      ),
    ).toBe(true);
    expect(
      isRampTranslateUrl(
        'https://on-ramp.uat-api.cx.metamask.io/providers/transak-native-staging/native/translate',
      ),
    ).toBe(true);
  });
});

describe('isTransakGatewayUrl', () => {
  it('matches production and staging login', () => {
    expect(
      isTransakGatewayUrl(
        'https://api-gateway.transak.com/api/v2/auth/login',
        '/api/v2/auth/login',
      ),
    ).toBe(true);
    expect(
      isTransakGatewayUrl(
        'https://api-gateway-stg.transak.com/api/v2/auth/login',
        '/api/v2/auth/login',
      ),
    ).toBe(true);
  });

  it('does not match a dev gateway', () => {
    expect(
      isTransakGatewayUrl(
        'https://api-gateway-dev.transak.com/api/v2/auth/login',
        '/api/v2/auth/login',
      ),
    ).toBe(false);
  });
});

describe('RAMP_TOKEN_ICON_URL', () => {
  it('matches production and UAT icon URLs', () => {
    expect(
      RAMP_TOKEN_ICON_URL.test(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      ),
    ).toBe(true);
    expect(
      RAMP_TOKEN_ICON_URL.test(
        'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      ),
    ).toBe(true);
  });
});
