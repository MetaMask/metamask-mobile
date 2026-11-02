import FixtureBuilder from './FixtureBuilder';
import defaultFixture from './json/default-fixture.json';

/**
 * The 6 legacy asset controllers were removed from the app and from the
 * persisted `default-fixture.json` (so the fixture schema matches the app),
 * but many builder methods and specs still write to these keys. They are
 * re-injected in memory by `withDefaultFixture()` via
 * `LEGACY_ASSET_CONTROLLERS_STATE`. The app ignores them.
 *
 * These tests pin both halves of that contract: the JSON stays clean, and the
 * builder restores the legacy keys with their exact default shapes.
 */
describe('FixtureBuilder legacy asset controllers', () => {
  const LEGACY_KEYS = [
    'AccountTrackerController',
    'CurrencyRateController',
    'MultichainAssetsController',
    'MultichainAssetsRatesController',
    'TokenBalancesController',
    'TokenRatesController',
  ] as const;

  describe('default-fixture.json', () => {
    it('omits the removed legacy asset controllers', () => {
      const backgroundState = (
        defaultFixture as {
          state: { engine: { backgroundState: Record<string, unknown> } };
        }
      ).state.engine.backgroundState;

      for (const key of LEGACY_KEYS) {
        expect(backgroundState).not.toHaveProperty(key);
      }
    });
  });

  describe('withDefaultFixture()', () => {
    it('re-injects every legacy asset controller in memory', () => {
      const fixture = new FixtureBuilder().withDefaultFixture().build();
      const backgroundState = fixture.state.engine.backgroundState as Record<
        string,
        unknown
      >;

      for (const key of LEGACY_KEYS) {
        expect(backgroundState).toHaveProperty(key);
      }
    });

    it('restores the exact legacy controller default shapes', () => {
      const fixture = new FixtureBuilder().withDefaultFixture().build();
      const backgroundState = fixture.state.engine.backgroundState as Record<
        string,
        unknown
      >;

      expect(backgroundState.AccountTrackerController).toStrictEqual({
        accountsByChainId: {
          '1': {
            '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': { balance: '0x0' },
          },
          '64': {
            '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': { balance: '0x0' },
          },
        },
      });

      expect(backgroundState.CurrencyRateController).toStrictEqual({
        currencyRates: {
          ETH: {
            conversionDate: 1684232383.997,
            conversionRate: 1815.41,
            usdConversionRate: 1815.41,
          },
        },
        currentCurrency: 'usd',
      });

      expect(backgroundState.MultichainAssetsController).toStrictEqual({
        accountsAssets: {},
        assetsMetadata: {},
      });

      expect(backgroundState.MultichainAssetsRatesController).toStrictEqual({
        conversionRates: {},
      });

      expect(backgroundState.TokenBalancesController).toStrictEqual({
        tokenBalances: {},
      });

      expect(backgroundState.TokenRatesController).toStrictEqual({
        marketData: {},
      });
    });
  });
});
