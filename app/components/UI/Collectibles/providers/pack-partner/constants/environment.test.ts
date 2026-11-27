import { SolScope } from '@metamask/keyring-api';
import {
  PACK_PARTNER_ENVIRONMENTS,
  resolvePackPartnerEnvironment,
  resolvePackPartnerApiKey,
  resolvePackPartnerConfig,
  resolvePackPartnerUrl,
} from './environment';

describe('PackPartner environment configuration', () => {
  it.each([
    [undefined, true, 'devnet'],
    [undefined, false, 'mainnet'],
    ['devnet', false, 'devnet'],
    ['mainnet', true, 'mainnet'],
  ] as const)(
    'resolves %p in development=%p to %s',
    (value, development, expected) => {
      expect(resolvePackPartnerEnvironment(value, development)).toBe(expected);
    },
  );

  it.each(['testnet', 'MAINNET', 'unknown'])(
    'rejects an unsupported environment %s',
    (value) => {
      expect(() => resolvePackPartnerEnvironment(value, true)).toThrow(
        'must be devnet or mainnet',
      );
    },
  );

  it('fixes the settlement token to its network independently of local hosts', () => {
    const { mainnet, devnet } = PACK_PARTNER_ENVIRONMENTS;

    expect(mainnet.scope).toBe(SolScope.Mainnet);
    expect(devnet.scope).toBe(SolScope.Devnet);
    expect(devnet.usdcMint).toBe(
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    );
    expect(mainnet.usdcMint).toBe(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    );
    expect(devnet.usdcMint).not.toBe(mainnet.usdcMint);
  });

  it.each(['mainnet', 'devnet'] as const)(
    'selects only the %s endpoints',
    (environment) => {
      const endpoints = {
        mainnet: {
          apiUrl: 'https://mainnet.pack-partner.example/api',
          cardsApiUrl: 'https://mainnet-cards.pack-partner.example',
          websiteUrl: 'https://mainnet-website.pack-partner.example',
        },
        devnet: {
          apiUrl: 'https://devnet.pack-partner.example/api',
          cardsApiUrl: 'https://devnet-cards.pack-partner.example',
          websiteUrl: 'https://devnet-website.pack-partner.example',
        },
      };

      const config = resolvePackPartnerConfig(environment, endpoints);

      expect(config).toEqual({
        ...PACK_PARTNER_ENVIRONMENTS[environment],
        ...endpoints[environment],
      });
    },
  );

  it.each(['mainnet', 'devnet'] as const)(
    'leaves %s endpoints unavailable when only the other environment is configured',
    (environment) => {
      const other = environment === 'mainnet' ? 'devnet' : 'mainnet';

      const config = resolvePackPartnerConfig(environment, {
        [other]: {
          apiUrl: 'https://other.pack-partner.example/api',
          cardsApiUrl: 'https://cards.pack-partner.example',
          websiteUrl: 'https://website.pack-partner.example',
        },
      });

      expect(config).toEqual({
        ...PACK_PARTNER_ENVIRONMENTS[environment],
        apiUrl: undefined,
        cardsApiUrl: undefined,
        websiteUrl: undefined,
      });
    },
  );

  it('keeps valid endpoints usable when another endpoint is absent or malformed', () => {
    const config = resolvePackPartnerConfig('devnet', {
      devnet: {
        apiUrl: 'not a URL',
        cardsApiUrl: 'https://cards.pack-partner.example/',
      },
    });

    expect(config).toMatchObject({
      apiUrl: undefined,
      cardsApiUrl: 'https://cards.pack-partner.example',
      websiteUrl: undefined,
    });
  });

  it.each([
    undefined,
    '',
    ' ',
    'not a URL',
    '/api',
    'http://pack-partner.example/api',
    'https://user:password@pack-partner.example/api',
    'https://pack-partner.example/api?key=secret',
    'https://pack-partner.example/api?',
    'https://pack-partner.example/api#section',
    'https://pack-partner.example/api#',
  ])('rejects an unusable or unsafe endpoint %p', (value) => {
    const result = resolvePackPartnerUrl(value);

    expect(result).toBeUndefined();
  });

  it.each([
    ['https://pack-partner.example/', 'https://pack-partner.example'],
    ['https://pack-partner.example/api/', 'https://pack-partner.example/api'],
    ['https://pack-partner.example/api', 'https://pack-partner.example/api'],
  ])('normalizes an HTTPS endpoint %s to %s', (value, expected) => {
    const result = resolvePackPartnerUrl(value);

    expect(result).toBe(expected);
  });

  it('allows an optional key for local devnet development', () => {
    const key = resolvePackPartnerApiKey('devnet', 'test-devnet-key', true);

    expect(key).toBe('test-devnet-key');
  });

  it.each([
    ['mainnet', true],
    ['mainnet', false],
    ['devnet', false],
  ] as const)(
    'ignores a key on %s with development=%s',
    (environment, development) => {
      const key = resolvePackPartnerApiKey(
        environment,
        'test-devnet-key',
        development,
      );

      expect(key).toBeUndefined();
    },
  );

  it.each([undefined, '', '   '])(
    'keeps public devnet access for an absent key (%p)',
    (value) => {
      const key = resolvePackPartnerApiKey('devnet', value, true);

      expect(key).toBeUndefined();
    },
  );
});
