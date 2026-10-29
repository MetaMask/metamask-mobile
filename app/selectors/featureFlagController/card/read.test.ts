import { getVersion } from 'react-native-device-info';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';
import {
  DEFAULT_IMMERSVE_CHAINS,
  DEFAULT_IMMERSVE_CONFIG,
  DEFAULT_IMMERSVE_COUNTRIES,
  defaultCardFeatureFlag,
} from './defaults';
import {
  IMPLEMENTED_PROVISIONING_WALLETS,
  NO_PROVISIONING_WALLETS,
  getCardUkMigrationUpdateBadgeSeverity,
  isCardUkMigrationEligible,
  readCardFeatureFlag,
  readCardLinkApiEnabled,
  readCardProviderChains,
  readCardProviderConfig,
  readCardProviderCountries,
  readCardImmersveMfaEnabled,
  readCardProviderEnabled,
  readCardUkMigrationFlag,
  readCardUkMigrationSignInRoutingEnabled,
  resolveCardProviderForCountry,
  resolveCardProvisioningWallets,
  resolveCardUkMigrationState,
} from './read';
import type { ProvisioningWallet } from './types';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '10.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => {
  const actual = jest.requireActual('../../../util/remoteFeatureFlag');
  return {
    ...actual,
    validatedVersionGatedFeatureFlag: jest.fn((flag: unknown) =>
      actual.validatedVersionGatedFeatureFlag(flag),
    ),
  };
});

const mockGetVersion = jest.mocked(getVersion);
const mockVersionGate = jest.mocked(validatedVersionGatedFeatureFlag);
const actualVersionGate = jest.requireActual<
  typeof import('../../../util/remoteFeatureFlag')
>('../../../util/remoteFeatureFlag').validatedVersionGatedFeatureFlag;

const IMMERSVE = 'immersve';

describe('card feature flag readers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVersion.mockReturnValue('10.0.0');
    mockVersionGate.mockImplementation(actualVersionGate);
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

  describe('readCardUkMigrationFlag', () => {
    it('returns null when absent or invalid', () => {
      expect(readCardUkMigrationFlag(undefined)).toBeNull();
      expect(readCardUkMigrationFlag({ cardUkMigration: {} })).toBeNull();
    });

    it('unwraps a progressive-rollout value wrapper', () => {
      expect(
        readCardUkMigrationFlag({
          cardUkMigration: {
            name: 'treatment',
            value: {
              enabled: true,
              minimumVersion: '0.0.0',
              startDate: '2026-09-01T00:00:00.000Z',
              endDate: '2026-09-30T23:59:59.999Z',
            },
          },
        }),
      ).toEqual({
        enabled: true,
        minimumVersion: '0.0.0',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.999Z',
      });
    });

    it('ignores a remote countries field when present', () => {
      expect(
        readCardUkMigrationFlag({
          cardUkMigration: {
            enabled: true,
            minimumVersion: '0.0.0',
            startDate: '2026-09-01T00:00:00.000Z',
            endDate: '2026-09-30T23:59:59.999Z',
            countries: ['US', 'GB'],
          },
        }),
      ).toEqual({
        enabled: true,
        minimumVersion: '0.0.0',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.999Z',
      });
    });
  });

  describe('resolveCardUkMigrationState', () => {
    const softFlag = {
      enabled: true,
      minimumVersion: '0.0.0',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.999Z',
    };

    it('is off when the flag is absent', () => {
      expect(resolveCardUkMigrationState(undefined).phase).toBe('off');
    });

    it('is off when disabled', () => {
      expect(
        resolveCardUkMigrationState(
          { cardUkMigration: { ...softFlag, enabled: false } },
          new Date('2026-09-15T12:00:00.000Z'),
        ).phase,
      ).toBe('off');
    });

    it('is off when version gate fails', () => {
      mockGetVersion.mockReturnValue('8.0.0');
      expect(
        resolveCardUkMigrationState(
          {
            cardUkMigration: {
              ...softFlag,
              minimumVersion: '9.0.0',
            },
          },
          new Date('2026-09-15T12:00:00.000Z'),
        ).phase,
      ).toBe('off');
    });

    it('is off before startDate', () => {
      expect(
        resolveCardUkMigrationState(
          { cardUkMigration: softFlag },
          new Date('2026-08-31T23:59:59.000Z'),
        ).phase,
      ).toBe('off');
    });

    it('is soft between startDate and endDate', () => {
      const state = resolveCardUkMigrationState(
        { cardUkMigration: softFlag },
        new Date('2026-09-15T12:00:00.000Z'),
      );
      expect(state).toEqual({
        phase: 'soft',
        isActive: true,
        deadline: new Date('2026-09-30T23:59:59.999Z'),
      });
    });

    it('is forced at and after endDate', () => {
      expect(
        resolveCardUkMigrationState(
          { cardUkMigration: softFlag },
          new Date('2026-09-30T23:59:59.999Z'),
        ).phase,
      ).toBe('forced');
      expect(
        resolveCardUkMigrationState(
          { cardUkMigration: softFlag },
          new Date('2026-10-01T00:00:00.000Z'),
        ).phase,
      ).toBe('forced');
    });

    it('is off when startDate is missing', () => {
      const { startDate: _startDate, ...withoutStart } = softFlag;
      expect(
        resolveCardUkMigrationState(
          { cardUkMigration: withoutStart },
          new Date('2026-09-15T12:00:00.000Z'),
        ).phase,
      ).toBe('off');
    });

    it('is off when endDate is missing', () => {
      const { endDate: _endDate, ...withoutEnd } = softFlag;
      expect(
        resolveCardUkMigrationState(
          { cardUkMigration: withoutEnd },
          new Date('2026-09-15T12:00:00.000Z'),
        ).phase,
      ).toBe('off');
    });

    it('is off when a date is invalid', () => {
      expect(
        resolveCardUkMigrationState(
          {
            cardUkMigration: {
              ...softFlag,
              startDate: 'not-a-date',
            },
          },
          new Date('2026-09-15T12:00:00.000Z'),
        ).phase,
      ).toBe('off');
    });

    it('is off when startDate equals endDate', () => {
      expect(
        resolveCardUkMigrationState(
          {
            cardUkMigration: {
              ...softFlag,
              startDate: '2026-09-30T23:59:59.999Z',
              endDate: '2026-09-30T23:59:59.999Z',
            },
          },
          new Date('2026-09-30T23:59:59.999Z'),
        ).phase,
      ).toBe('off');
    });

    it('is off when startDate is after endDate', () => {
      expect(
        resolveCardUkMigrationState(
          {
            cardUkMigration: {
              ...softFlag,
              startDate: '2026-10-01T00:00:00.000Z',
              endDate: '2026-09-30T23:59:59.999Z',
            },
          },
          new Date('2026-10-02T00:00:00.000Z'),
        ).phase,
      ).toBe('off');
    });
  });

  describe('isCardUkMigrationEligible', () => {
    const activeState = {
      phase: 'soft' as const,
      isActive: true,
      deadline: new Date('2026-09-30T23:59:59.999Z'),
    };

    it('requires an active phase, Baanx provider, and GB region', () => {
      expect(
        isCardUkMigrationEligible(activeState, {
          providerId: 'baanx',
          regionCode: 'GB',
        }),
      ).toBe(true);
      expect(
        isCardUkMigrationEligible(
          { ...activeState, isActive: false, phase: 'off' },
          { providerId: 'baanx', regionCode: 'GB' },
        ),
      ).toBe(false);
      expect(
        isCardUkMigrationEligible(activeState, {
          providerId: 'immersve',
          regionCode: 'GB',
        }),
      ).toBe(false);
      expect(
        isCardUkMigrationEligible(activeState, {
          providerId: 'baanx',
          regionCode: 'US',
        }),
      ).toBe(false);
    });

    it('returns false when the user has completed migration', () => {
      expect(
        isCardUkMigrationEligible(activeState, {
          providerId: 'baanx',
          regionCode: 'GB',
          hasCompletedMigration: true,
        }),
      ).toBe(false);
    });
  });

  describe('readCardLinkApiEnabled', () => {
    const originalEnv = process.env.MM_CARD_LINK_API_ENABLED;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.MM_CARD_LINK_API_ENABLED;
      } else {
        process.env.MM_CARD_LINK_API_ENABLED = originalEnv;
      }
    });

    it('reads the version-gated cardLinkApi flag when present', () => {
      process.env.MM_CARD_LINK_API_ENABLED = 'true';
      expect(
        readCardLinkApiEnabled({
          cardLinkApi: { enabled: true, minimumVersion: '0.0.0' },
        }),
      ).toBe(true);
      expect(
        readCardLinkApiEnabled({
          cardLinkApi: { enabled: false, minimumVersion: '0.0.0' },
        }),
      ).toBe(false);
    });

    it('is off when the app is below cardLinkApi.minimumVersion', () => {
      process.env.MM_CARD_LINK_API_ENABLED = 'true';
      expect(
        readCardLinkApiEnabled({
          cardLinkApi: { enabled: true, minimumVersion: '99.0.0' },
        }),
      ).toBe(false);
    });

    it('ignores cardFeature.cardLinkApiEnabled', () => {
      delete process.env.MM_CARD_LINK_API_ENABLED;
      expect(
        readCardLinkApiEnabled({ cardFeature: { cardLinkApiEnabled: true } }),
      ).toBe(false);
    });

    it('falls back to MM_CARD_LINK_API_ENABLED when the remote flag is absent', () => {
      process.env.MM_CARD_LINK_API_ENABLED = 'true';
      expect(readCardLinkApiEnabled({})).toBe(true);
      delete process.env.MM_CARD_LINK_API_ENABLED;
      expect(readCardLinkApiEnabled({})).toBe(false);
    });
  });

  describe('readCardUkMigrationSignInRoutingEnabled', () => {
    const originalEnv =
      process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED;
      } else {
        process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED = originalEnv;
      }
    });

    it('reads the version-gated remote flag when present', () => {
      delete process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED;
      expect(
        readCardUkMigrationSignInRoutingEnabled({
          cardUkMigrationSignInRouting: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
        }),
      ).toBe(true);
      expect(
        readCardUkMigrationSignInRoutingEnabled({
          cardUkMigrationSignInRouting: {
            enabled: false,
            minimumVersion: '0.0.0',
          },
        }),
      ).toBe(false);
    });

    it('falls back to the env override when the remote flag is absent', () => {
      process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED = 'true';
      expect(readCardUkMigrationSignInRoutingEnabled({})).toBe(true);
      process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED = 'false';
      expect(readCardUkMigrationSignInRoutingEnabled({})).toBe(false);
    });
  });

  describe('readCardImmersveMfaEnabled', () => {
    const originalEnv = process.env.MM_CARD_IMMERSVE_MFA_ENABLED;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.MM_CARD_IMMERSVE_MFA_ENABLED;
      } else {
        process.env.MM_CARD_IMMERSVE_MFA_ENABLED = originalEnv;
      }
    });

    it('returns true when the remote flag is enabled for this version', () => {
      delete process.env.MM_CARD_IMMERSVE_MFA_ENABLED;
      expect(
        readCardImmersveMfaEnabled({
          cardImmersveMfa: { enabled: true, minimumVersion: '0.0.0' },
        }),
      ).toBe(true);
    });

    it('returns false when the remote flag is disabled', () => {
      process.env.MM_CARD_IMMERSVE_MFA_ENABLED = 'true';
      expect(
        readCardImmersveMfaEnabled({
          cardImmersveMfa: { enabled: false, minimumVersion: '0.0.0' },
        }),
      ).toBe(false);
    });

    it('returns false when the flag is missing or malformed', () => {
      delete process.env.MM_CARD_IMMERSVE_MFA_ENABLED;
      expect(readCardImmersveMfaEnabled({})).toBe(false);
      expect(readCardImmersveMfaEnabled(undefined)).toBe(false);
      expect(
        readCardImmersveMfaEnabled({ cardImmersveMfa: { enabled: 'yes' } }),
      ).toBe(false);
    });

    it('returns false when this version is below minimumVersion', () => {
      delete process.env.MM_CARD_IMMERSVE_MFA_ENABLED;
      expect(
        readCardImmersveMfaEnabled({
          cardImmersveMfa: { enabled: true, minimumVersion: '99.0.0' },
        }),
      ).toBe(false);
    });

    it('falls back to the env override only when the remote flag is absent', () => {
      process.env.MM_CARD_IMMERSVE_MFA_ENABLED = 'true';
      expect(readCardImmersveMfaEnabled({})).toBe(true);
      process.env.MM_CARD_IMMERSVE_MFA_ENABLED = 'false';
      expect(readCardImmersveMfaEnabled({})).toBe(false);
    });
  });

  describe('getCardUkMigrationUpdateBadgeSeverity', () => {
    const deadline = new Date('2026-09-30T23:59:59.999Z');

    it('returns null when migration is inactive', () => {
      expect(
        getCardUkMigrationUpdateBadgeSeverity({
          phase: 'off',
          isActive: false,
          deadline,
        }),
      ).toBeNull();
    });

    it('returns info when soft period started more than 7 days before end', () => {
      expect(
        getCardUkMigrationUpdateBadgeSeverity(
          { phase: 'soft', isActive: true, deadline },
          new Date('2026-09-20T00:00:00.000Z'),
        ),
      ).toBe('info');
    });

    it('returns warning when soft period is within 7 days of end', () => {
      expect(
        getCardUkMigrationUpdateBadgeSeverity(
          { phase: 'soft', isActive: true, deadline },
          new Date('2026-09-24T00:00:00.000Z'),
        ),
      ).toBe('warning');
      expect(
        getCardUkMigrationUpdateBadgeSeverity(
          { phase: 'soft', isActive: true, deadline },
          new Date('2026-09-30T12:00:00.000Z'),
        ),
      ).toBe('warning');
    });

    it('returns danger when soft period has ended (forced)', () => {
      expect(
        getCardUkMigrationUpdateBadgeSeverity(
          { phase: 'forced', isActive: true, deadline },
          new Date('2026-10-01T00:00:00.000Z'),
        ),
      ).toBe('danger');
    });

    it('returns danger after deadline when cached phase remains soft', () => {
      const state = { phase: 'soft' as const, isActive: true, deadline };

      const severity = getCardUkMigrationUpdateBadgeSeverity(
        state,
        new Date('2026-10-01T00:00:00.000Z'),
      );

      expect(severity).toBe('danger');
    });
  });
});

const provisioningOn = (minimumVersion = '0.0.0') => ({
  enabled: true,
  minimumVersion,
});

const provisioningOff = (minimumVersion = '0.0.0') => ({
  enabled: false,
  minimumVersion,
});

const WITH_SAMSUNG: ProvisioningWallet[] = [
  ...IMPLEMENTED_PROVISIONING_WALLETS,
  'samsung_pay',
];

const legacyProvisioningFlags = {
  galileoAppleWalletInAppProvisioningEnabled: provisioningOn(),
  galileoGoogleWalletInAppProvisioningEnabled: provisioningOn(),
  immersveAppleWalletInAppProvisioningEnabled: provisioningOn(),
};

const baanxUsAppleFlag = {
  cardBaanxProvisioning: {
    enabled: true,
    minimumVersion: '0.0.0',
    countries: {
      US: {
        enabled: true,
        ios: { apple_wallet: provisioningOn() },
        android: { google_wallet: provisioningOn() },
      },
    },
  },
};

describe('resolveCardProvisioningWallets', () => {
  beforeEach(() => {
    mockGetVersion.mockReturnValue('10.0.0');
    mockVersionGate.mockImplementation(actualVersionGate);
  });

  const iosGalileo = {
    platform: 'ios' as const,
    countryCode: 'US',
    cardProcessor: 'galileo',
  };

  it('returns the shared empty list for an unknown provider', () => {
    const result = resolveCardProvisioningWallets(
      baanxUsAppleFlag,
      'other',
      iosGalileo,
    );

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('keeps a wallet when the provider gate and the leaf are enabled', () => {
    const result = resolveCardProvisioningWallets(
      baanxUsAppleFlag,
      'baanx',
      iosGalileo,
    );

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('returns no wallets when the provider gate is disabled', () => {
    const flags = {
      ...legacyProvisioningFlags,
      cardBaanxProvisioning: {
        ...baanxUsAppleFlag.cardBaanxProvisioning,
        enabled: false,
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('returns no wallets when the country entry is disabled', () => {
    const flags = {
      ...legacyProvisioningFlags,
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: false,
            ios: { apple_wallet: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('returns no wallets when the wallet leaf is disabled', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            ios: { apple_wallet: provisioningOff() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('drops the provider when its minimumVersion is above the app version', () => {
    mockGetVersion.mockReturnValue('10.0.0');
    const flags = {
      ...legacyProvisioningFlags,
      cardBaanxProvisioning: {
        ...baanxUsAppleFlag.cardBaanxProvisioning,
        minimumVersion: '11.0.0',
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('keeps the provider when its minimumVersion is below the app version', () => {
    const flags = {
      cardBaanxProvisioning: {
        ...baanxUsAppleFlag.cardBaanxProvisioning,
        minimumVersion: '9.0.0',
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('drops a leaf whose minimumVersion is above the app version', () => {
    const flags = {
      ...legacyProvisioningFlags,
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            ios: { apple_wallet: provisioningOn('11.0.0') },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('keeps a leaf whose minimumVersion is below the app version', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            ios: { apple_wallet: provisioningOn('9.0.0') },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('reads a flag wrapped in a name and value envelope', () => {
    const flags = {
      cardBaanxProvisioning: {
        name: 'treatment',
        value: baanxUsAppleFlag.cardBaanxProvisioning,
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('derives legacy wallets when the new key is missing', () => {
    const result = resolveCardProvisioningWallets(
      legacyProvisioningFlags,
      'baanx',
      iosGalileo,
    );

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('derives legacy wallets when the new key is a string', () => {
    const result = resolveCardProvisioningWallets(
      { ...legacyProvisioningFlags, cardBaanxProvisioning: 'on' },
      'baanx',
      iosGalileo,
    );

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('derives legacy wallets when the new key is an array', () => {
    const result = resolveCardProvisioningWallets(
      { ...legacyProvisioningFlags, cardBaanxProvisioning: [] },
      'baanx',
      iosGalileo,
    );

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('derives legacy wallets when the new key has no countries object', () => {
    const result = resolveCardProvisioningWallets(
      {
        ...legacyProvisioningFlags,
        cardBaanxProvisioning: { enabled: true, minimumVersion: '0.0.0' },
      },
      'baanx',
      iosGalileo,
    );

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('returns no wallets for an empty countries object and ignores legacy keys', () => {
    const result = resolveCardProvisioningWallets(
      {
        ...legacyProvisioningFlags,
        cardBaanxProvisioning: {
          enabled: true,
          minimumVersion: '0.0.0',
          countries: {},
        },
      },
      'baanx',
      iosGalileo,
    );

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('returns no wallets when the version helper returns undefined', () => {
    mockVersionGate.mockReturnValue(undefined);

    const result = resolveCardProvisioningWallets(
      { ...legacyProvisioningFlags, ...baanxUsAppleFlag },
      'baanx',
      iosGalileo,
    );

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('drops apple_wallet listed under android', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            android: { apple_wallet: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', {
      platform: 'android',
      countryCode: 'US',
      cardProcessor: 'galileo',
    });

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('ignores devices on an apple_wallet leaf', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            ios: {
              apple_wallet: { ...provisioningOn(), devices: ['phone'] },
            },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('drops google_wallet listed under ios', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            ios: { google_wallet: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('drops samsung_pay in this build', () => {
    const flags = {
      cardImmersveProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          AU: {
            enabled: true,
            android: { samsung_pay: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'immersve', {
      platform: 'android',
      countryCode: 'AU',
    });

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('uses phone and watch when an implemented samsung leaf omits devices', () => {
    const flags = {
      cardImmersveProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          AU: {
            enabled: true,
            android: { samsung_pay: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(
      flags,
      'immersve',
      { platform: 'android', countryCode: 'AU' },
      WITH_SAMSUNG,
    );

    expect(result).toEqual([
      { wallet: 'samsung_pay', devices: ['phone', 'watch'] },
    ]);
  });

  it('drops an implemented samsung leaf whose devices list is empty', () => {
    const flags = {
      cardImmersveProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          AU: {
            enabled: true,
            android: {
              samsung_pay: { ...provisioningOn(), devices: [] },
            },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(
      flags,
      'immersve',
      { platform: 'android', countryCode: 'AU' },
      WITH_SAMSUNG,
    );

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('keeps phone when that is the only samsung device', () => {
    const flags = {
      cardImmersveProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          AU: {
            enabled: true,
            android: {
              samsung_pay: {
                ...provisioningOn(),
                devices: ['phone', 'tablet'],
              },
            },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(
      flags,
      'immersve',
      { platform: 'android', countryCode: 'AU' },
      WITH_SAMSUNG,
    );

    expect(result).toEqual([{ wallet: 'samsung_pay', devices: ['phone'] }]);
  });

  it('matches a lowercase country fact to an uppercase flag key', () => {
    const result = resolveCardProvisioningWallets(baanxUsAppleFlag, 'baanx', {
      ...iosGalileo,
      countryCode: 'us',
    });

    expect(result).toEqual([{ wallet: 'apple_wallet' }]);
  });

  it('treats a country key named * as an unknown country', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          '*': {
            enabled: true,
            ios: { apple_wallet: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('passes galileo and fails other processors for cardProcessors galileo', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            eligibility: { cardProcessors: ['galileo'] },
            ios: { apple_wallet: provisioningOn() },
          },
        },
      },
    };

    expect(resolveCardProvisioningWallets(flags, 'baanx', iosGalileo)).toEqual([
      { wallet: 'apple_wallet' },
    ]);
    expect(
      resolveCardProvisioningWallets(flags, 'baanx', {
        ...iosGalileo,
        cardProcessor: 'monavate',
      }),
    ).toBe(NO_PROVISIONING_WALLETS);
    expect(
      resolveCardProvisioningWallets(flags, 'baanx', {
        ...iosGalileo,
        cardProcessor: 'Galileo',
      }),
    ).toBe(NO_PROVISIONING_WALLETS);
    expect(
      resolveCardProvisioningWallets(flags, 'baanx', {
        ...iosGalileo,
        cardProcessor: '',
      }),
    ).toBe(NO_PROVISIONING_WALLETS);
    expect(
      resolveCardProvisioningWallets(flags, 'baanx', {
        platform: 'ios',
        countryCode: 'US',
      }),
    ).toBe(NO_PROVISIONING_WALLETS);
  });

  it('lets a wallet cardProcessors list replace the country list', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            eligibility: { cardProcessors: ['galileo'] },
            ios: {
              apple_wallet: {
                ...provisioningOn(),
                eligibility: { cardProcessors: ['monavate'] },
              },
            },
          },
        },
      },
    };

    const monavate = resolveCardProvisioningWallets(flags, 'baanx', {
      ...iosGalileo,
      cardProcessor: 'monavate',
    });
    const galileo = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(monavate).toEqual([{ wallet: 'apple_wallet' }]);
    expect(galileo).toBe(NO_PROVISIONING_WALLETS);
  });

  it('fails a leaf that carries an unknown eligibility key', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            eligibility: { regions: ['US'] },
            ios: { apple_wallet: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('fails a leaf whose cardProcessors array is empty', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            eligibility: { cardProcessors: [] },
            ios: { apple_wallet: provisioningOn() },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(flags, 'baanx', iosGalileo);

    expect(result).toBe(NO_PROVISIONING_WALLETS);
  });

  it('offers legacy Baanx Apple Pay only for a US galileo account', () => {
    const apple = resolveCardProvisioningWallets(
      {
        galileoAppleWalletInAppProvisioningEnabled: provisioningOn(),
        galileoGoogleWalletInAppProvisioningEnabled: provisioningOff(),
      },
      'baanx',
      iosGalileo,
    );
    const google = resolveCardProvisioningWallets(
      { galileoGoogleWalletInAppProvisioningEnabled: provisioningOn() },
      'baanx',
      { platform: 'android', countryCode: 'US', cardProcessor: 'galileo' },
    );
    const monavate = resolveCardProvisioningWallets(
      legacyProvisioningFlags,
      'baanx',
      { ...iosGalileo, cardProcessor: 'monavate' },
    );
    const nonUs = resolveCardProvisioningWallets(
      legacyProvisioningFlags,
      'baanx',
      { ...iosGalileo, countryCode: 'GB' },
    );

    expect(apple).toEqual([{ wallet: 'apple_wallet' }]);
    expect(google).toEqual([{ wallet: 'google_wallet' }]);
    expect(monavate).toBe(NO_PROVISIONING_WALLETS);
    expect(nonUs).toBe(NO_PROVISIONING_WALLETS);
  });

  it('offers legacy Immersve Apple Pay for NZ and AU on iOS only', () => {
    const nz = resolveCardProvisioningWallets(
      { immersveAppleWalletInAppProvisioningEnabled: provisioningOn() },
      'immersve',
      { platform: 'ios', countryCode: 'NZ' },
    );
    const auOff = resolveCardProvisioningWallets(
      { immersveAppleWalletInAppProvisioningEnabled: provisioningOff() },
      'immersve',
      { platform: 'ios', countryCode: 'AU' },
    );
    const sg = resolveCardProvisioningWallets(
      legacyProvisioningFlags,
      'immersve',
      { platform: 'ios', countryCode: 'SG' },
    );
    const android = resolveCardProvisioningWallets(
      legacyProvisioningFlags,
      'immersve',
      { platform: 'android', countryCode: 'AU' },
    );

    expect(nz).toEqual([{ wallet: 'apple_wallet' }]);
    expect(auOff).toBe(NO_PROVISIONING_WALLETS);
    expect(sg).toBe(NO_PROVISIONING_WALLETS);
    expect(android).toBe(NO_PROVISIONING_WALLETS);
  });

  it('returns google wallet before samsung pay', () => {
    const flags = {
      cardBaanxProvisioning: {
        enabled: true,
        minimumVersion: '0.0.0',
        countries: {
          US: {
            enabled: true,
            android: {
              samsung_pay: { ...provisioningOn(), devices: ['watch'] },
              google_wallet: provisioningOn(),
            },
          },
        },
      },
    };

    const result = resolveCardProvisioningWallets(
      flags,
      'baanx',
      { platform: 'android', countryCode: 'US' },
      WITH_SAMSUNG,
    );

    expect(result).toEqual([
      { wallet: 'google_wallet' },
      { wallet: 'samsung_pay', devices: ['watch'] },
    ]);
  });
});
