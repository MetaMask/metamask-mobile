import { getVersion } from 'react-native-device-info';
import {
  DEFAULT_IMMERSVE_CHAINS,
  DEFAULT_IMMERSVE_CONFIG,
  DEFAULT_IMMERSVE_COUNTRIES,
  defaultCardFeatureFlag,
} from './defaults';
import {
  readCardFeatureFlag,
  readCardProviderChains,
  readCardProviderConfig,
  readCardProviderCountries,
  readCardProviderEnabled,
  resolveCardProviderForCountry,
} from './read';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '10.0.0'),
}));

const mockGetVersion = jest.mocked(getVersion);

const IMMERSVE = 'immersve';

describe('card feature flag readers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVersion.mockReturnValue('10.0.0');
  });

  describe('readCardFeatureFlag', () => {
    it('returns the remote value when present', () => {
      const cardFeature = { constants: { accountsApiUrl: 'https://x' } };
      expect(readCardFeatureFlag({ cardFeature })).toBe(cardFeature);
    });

    it('falls back to the default when absent or empty', () => {
      expect(readCardFeatureFlag(undefined)).toBe(defaultCardFeatureFlag);
      expect(readCardFeatureFlag({ cardFeature: {} })).toBe(
        defaultCardFeatureFlag,
      );
    });
  });

  describe('readCardProviderEnabled', () => {
    it('uses the cardImmersve switch when present', () => {
      expect(
        readCardProviderEnabled(
          { cardImmersve: { enabled: true, minimumVersion: '9.0.0' } },
          IMMERSVE,
        ),
      ).toBe(true);
    });

    it('unwraps a value-wrapped flag', () => {
      expect(
        readCardProviderEnabled(
          {
            cardImmersve: {
              name: 'treatment',
              value: { enabled: true, minimumVersion: '9.0.0' },
            },
          },
          IMMERSVE,
        ),
      ).toBe(true);
    });

    // A gradual-rollout flag is authored as an array of threshold cohorts;
    // RemoteFeatureFlagController collapses it to the selected cohort's `value`
    // before it reaches `remoteFeatureFlags`, so readers only ever see that.
    describe('gradual rollout', () => {
      it('enables for the resolved enabled cohort', () => {
        expect(
          readCardProviderEnabled(
            { cardImmersve: { enabled: true, minimumVersion: '8.0.0' } },
            IMMERSVE,
          ),
        ).toBe(true);
      });

      it('stays off for the resolved disabled cohort (not in rollout)', () => {
        expect(
          readCardProviderEnabled(
            { cardImmersve: { enabled: false, minimumVersion: '0.0.0' } },
            IMMERSVE,
          ),
        ).toBe(false);
      });

      it('still version-gates a user inside the enabled cohort', () => {
        mockGetVersion.mockReturnValue('8.0.0');
        expect(
          readCardProviderEnabled(
            { cardImmersve: { enabled: true, minimumVersion: '9.0.0' } },
            IMMERSVE,
          ),
        ).toBe(false);
      });

      // Guards the resolved-vs-raw contract on CardRemoteFeatureFlags: handing
      // readers `rawRemoteFeatureFlags` would pass the un-collapsed cohort array
      // through and switch the provider off for everyone.
      it('does not enable when handed a raw, un-resolved cohort array', () => {
        const rawRolloutFlag = [
          {
            scope: { type: 'threshold', value: 0.25 },
            thresholdName: 'enabled',
            thresholdVersion: 2,
            value: { enabled: true, minimumVersion: '0.0.0' },
          },
          {
            scope: { type: 'threshold', value: 1 },
            thresholdName: 'disabled',
            thresholdVersion: 2,
            value: { enabled: false, minimumVersion: '0.0.0' },
          },
        ];

        expect(
          readCardProviderEnabled({ cardImmersve: rawRolloutFlag }, IMMERSVE),
        ).toBe(false);
      });
    });

    it('gates off when the binary is below minimumVersion', () => {
      mockGetVersion.mockReturnValue('8.0.0');
      expect(
        readCardProviderEnabled(
          { cardImmersve: { enabled: true, minimumVersion: '9.0.0' } },
          IMMERSVE,
        ),
      ).toBe(false);
    });

    it('ignores the legacy cardFeature.immersve block entirely', () => {
      expect(
        readCardProviderEnabled(
          { cardFeature: { immersve: { enabled: true } } },
          IMMERSVE,
        ),
      ).toBe(false);
    });

    it('defaults to false with nothing configured', () => {
      expect(readCardProviderEnabled({}, IMMERSVE)).toBe(false);
    });

    it('returns false for an unknown provider', () => {
      expect(readCardProviderEnabled({}, 'nope')).toBe(false);
    });
  });

  describe('readCardProviderConfig', () => {
    it('prefers cardImmersveConfig', () => {
      const config = { cardProgramId: 'from-flag' };
      expect(
        readCardProviderConfig({ cardImmersveConfig: config }, IMMERSVE),
      ).toBe(config);
    });

    it('ignores the legacy cardFeature.immersve block entirely', () => {
      expect(
        readCardProviderConfig(
          { cardFeature: { immersve: { cardProgramId: 'legacy' } } },
          IMMERSVE,
        ),
      ).toBe(DEFAULT_IMMERSVE_CONFIG);
    });

    it('falls back to the default when nothing is configured', () => {
      expect(readCardProviderConfig({}, IMMERSVE)).toBe(
        DEFAULT_IMMERSVE_CONFIG,
      );
    });
  });

  describe('readCardProviderCountries', () => {
    it('prefers cardImmersveCountries', () => {
      expect(
        readCardProviderCountries(
          { cardImmersveCountries: ['FR', 'DE'] },
          IMMERSVE,
        ),
      ).toEqual(['FR', 'DE']);
    });

    it('ignores a malformed value and falls back', () => {
      expect(
        readCardProviderCountries(
          { cardImmersveCountries: [1, 2], cardFeature: {} },
          IMMERSVE,
        ),
      ).toBe(DEFAULT_IMMERSVE_COUNTRIES);
    });

    it('ignores the legacy immersveCountries key entirely', () => {
      expect(
        readCardProviderCountries(
          { cardFeature: { immersveCountries: ['ES'] } },
          IMMERSVE,
        ),
      ).toBe(DEFAULT_IMMERSVE_COUNTRIES);
    });
  });

  describe('readCardProviderChains', () => {
    it('falls back to the default chain map', () => {
      expect(readCardProviderChains({}, IMMERSVE)).toEqual(
        DEFAULT_IMMERSVE_CHAINS,
      );
    });

    it('reads networks and CAIP-19 token decimals from the flag', () => {
      const chains = readCardProviderChains(
        {
          cardImmersveChains: {
            'eip155:8453': {
              network: 'base-mainnet',
              rpcUrl: 'https://rpc',
              tokens: {
                'eip155:8453/erc20:0xAAA': { decimals: 6, symbol: 'USDC' },
              },
            },
          },
        },
        IMMERSVE,
      );

      expect(chains['eip155:8453']).toEqual({
        network: 'base-mainnet',
        rpcUrl: 'https://rpc',
        tokens: {
          'eip155:8453/erc20:0xAAA': { decimals: 6, symbol: 'USDC' },
        },
      });
    });

    it('drops a token whose CAIP-19 chain prefix does not match its parent', () => {
      const chains = readCardProviderChains(
        {
          cardImmersveChains: {
            'eip155:8453': {
              tokens: {
                'eip155:8453/erc20:0xAAA': { decimals: 6 },
                'eip155:59144/erc20:0xBBB': { decimals: 18 },
              },
            },
          },
        },
        IMMERSVE,
      );

      expect(Object.keys(chains['eip155:8453'].tokens ?? {})).toEqual([
        'eip155:8453/erc20:0xAAA',
      ]);
    });

    it('drops a token with non-numeric decimals', () => {
      const chains = readCardProviderChains(
        {
          cardImmersveChains: {
            'eip155:8453': {
              tokens: {
                'eip155:8453/erc20:0xAAA': { decimals: '6' },
              },
            },
          },
        },
        IMMERSVE,
      );

      expect(chains['eip155:8453'].tokens).toEqual({});
    });

    it('returns an empty map for an unknown provider', () => {
      expect(readCardProviderChains({}, 'nope')).toEqual({});
    });
  });

  describe('resolveCardProviderForCountry', () => {
    it('routes a claimed country to the enabled provider', () => {
      expect(
        resolveCardProviderForCountry(
          {
            cardImmersve: { enabled: true, minimumVersion: '0.0.0' },
            cardImmersveCountries: ['GB'],
          },
          'GB',
        ),
      ).toBe('immersve');
    });

    it('falls back to baanx when the provider is switched off', () => {
      expect(
        resolveCardProviderForCountry(
          {
            cardImmersve: { enabled: false, minimumVersion: '0.0.0' },
            cardImmersveCountries: ['GB'],
          },
          'GB',
        ),
      ).toBe('baanx');
    });

    it('falls back to baanx for an unclaimed country', () => {
      expect(
        resolveCardProviderForCountry(
          {
            cardImmersve: { enabled: true, minimumVersion: '0.0.0' },
            cardImmersveCountries: ['GB'],
          },
          'US',
        ),
      ).toBe('baanx');
    });

    it('does not route to a provider gated off by version', () => {
      mockGetVersion.mockReturnValue('8.0.0');
      expect(
        resolveCardProviderForCountry(
          {
            cardImmersve: { enabled: true, minimumVersion: '9.0.0' },
            cardImmersveCountries: ['GB'],
          },
          'GB',
        ),
      ).toBe('baanx');
    });
  });
});
