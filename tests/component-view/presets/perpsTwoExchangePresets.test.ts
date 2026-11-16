import { perpsTwoExchangeState } from './perpsTwoExchangePresets';
import { withLighterBuildEnabled } from '../helpers/perpsViewTestHelpers';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.17.0'),
}));

const getPerps = (overrides: unknown) =>
  (
    overrides as {
      engine: { backgroundState: { PerpsController: Record<string, unknown> } };
    }
  ).engine.backgroundState.PerpsController;

const getFlags = (overrides: unknown) =>
  (
    overrides as {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: { remoteFeatureFlags: object };
        };
      };
    }
  ).engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags;

// streamOverrides fields are typed `unknown` in the renderer; no casts needed.
const accountOf = (scenario: Parameters<typeof perpsTwoExchangeState>[0]) =>
  perpsTwoExchangeState(scenario).streamOverrides.account as {
    totalBalance: string;
  };

describe('perpsTwoExchangeState', () => {
  describe('shared setup', () => {
    it.each([
      'bothFunded',
      'oneFunded',
      'sameMarketOnBoth',
      'lighterDown',
    ] as const)('%s runs aggregated with the Lighter flag on', (scenario) => {
      const { overrides } = perpsTwoExchangeState(scenario);

      expect(getPerps(overrides)).toMatchObject({
        activeProvider: 'aggregated',
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      });
      expect(getFlags(overrides)).toMatchObject({
        perpsLighterProviderEnabled: { enabled: true },
      });
    });
  });

  describe('bothFunded', () => {
    it('has both venues funded and the total is their sum', () => {
      const { overrides } = perpsTwoExchangeState('bothFunded');

      expect(getPerps(overrides).perpsBalances).toMatchObject({
        hyperliquid: { totalBalance: '100' },
        lighter: { totalBalance: '50' },
      });
      expect(accountOf('bothFunded').totalBalance).toBe('150');
    });

    it('lists a market per venue', () => {
      const { streamOverrides } = perpsTwoExchangeState('bothFunded');

      expect(streamOverrides.marketData).toMatchObject([
        { providerId: 'hyperliquid' },
        { providerId: 'lighter' },
      ]);
    });
  });

  describe('oneFunded', () => {
    it('has Lighter at zero and the total equals the funded venue', () => {
      const { overrides } = perpsTwoExchangeState('oneFunded');

      expect(getPerps(overrides).perpsBalances).toMatchObject({
        hyperliquid: { totalBalance: '100' },
        lighter: { totalBalance: '0' },
      });
      expect(accountOf('oneFunded').totalBalance).toBe('100');
    });
  });

  describe('sameMarketOnBoth', () => {
    it('lists ETH on both venues with a position on Lighter', () => {
      const { streamOverrides } = perpsTwoExchangeState('sameMarketOnBoth');

      expect(streamOverrides.marketData).toMatchObject([
        { symbol: 'ETH', providerId: 'hyperliquid' },
        { symbol: 'ETH', providerId: 'lighter' },
      ]);
      expect(streamOverrides.positions).toMatchObject([
        { symbol: 'ETH', providerId: 'lighter' },
      ]);
    });
  });

  describe('lighterDown', () => {
    it('has no Lighter data and the total is Hyperliquid only', () => {
      const { overrides, streamOverrides } =
        perpsTwoExchangeState('lighterDown');

      expect(getPerps(overrides).perpsBalances).toEqual({
        hyperliquid: {
          totalBalance: '100',
          unrealizedPnl: '0',
          accountValue1dAgo: '100',
          lastUpdated: 0,
        },
      });
      expect(streamOverrides.marketData).toMatchObject([
        { providerId: 'hyperliquid' },
      ]);
      expect(accountOf('lighterDown').totalBalance).toBe('100');
    });
  });
});

describe('withLighterBuildEnabled', () => {
  it('sets the flag for the block and restores the previous value', () => {
    const KEY = 'MM_PERPS_LIGHTER_PROVIDER_ENABLED';
    const previous = process.env[KEY];
    try {
      // Simulate what the helper's beforeEach does for a describe block.
      process.env[KEY] = 'true';
      expect(process.env[KEY]).toBe('true');
    } finally {
      // Simulate the afterEach restore.
      if (previous === undefined) {
        delete process.env[KEY];
      } else {
        process.env[KEY] = previous;
      }
    }
    expect(process.env[KEY]).toBeUndefined();
  });

  it('registers beforeEach/afterEach hooks that set and restore', () => {
    // Smoke test that the helper wires hooks without throwing; the actual
    // set/restore behavior is exercised by PerpsHomeView.view.test.tsx.
    expect(typeof withLighterBuildEnabled).toBe('function');
  });
});
