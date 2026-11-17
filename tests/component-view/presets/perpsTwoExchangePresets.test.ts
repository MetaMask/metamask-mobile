import { withLighterBuildEnabled } from '../helpers/perpsViewTestHelpers';
import {
  perpsTwoExchangeState,
  type PerpsTwoExchangeScenario,
} from './perpsTwoExchangePresets';

describe('perpsTwoExchangeState', () => {
  it.each<[PerpsTwoExchangeScenario, string, string[], string[]]>([
    [
      'bothFunded',
      '150',
      ['hyperliquid', 'lighter'],
      ['hyperliquid', 'lighter'],
    ],
    [
      'oneFunded',
      '100',
      ['hyperliquid', 'lighter'],
      ['hyperliquid', 'lighter'],
    ],
    [
      'sameMarketOnBoth',
      '150',
      ['hyperliquid', 'lighter'],
      ['hyperliquid', 'lighter'],
    ],
    ['lighterDown', '100', ['hyperliquid'], ['hyperliquid']],
  ])(
    '%s totals %s with balances for %j and markets for %j',
    (scenario, total, balanceProviders, marketProviders) => {
      const { overrides, streamOverrides } = perpsTwoExchangeState(scenario);
      const perps = overrides.engine?.backgroundState?.PerpsController;

      expect(perps).toMatchObject({
        activeProvider: 'aggregated',
        isEligible: true,
      });
      expect(Object.keys(perps?.perpsBalances ?? {})).toEqual(balanceProviders);
      expect(streamOverrides.account).toMatchObject({ totalBalance: total });
      expect(
        (streamOverrides.marketData ?? []).map(
          (market) => (market as { providerId: string }).providerId,
        ),
      ).toEqual(marketProviders);
    },
  );

  it('puts Lighter at zero when only one exchange is funded', () => {
    const { overrides } = perpsTwoExchangeState('oneFunded');

    expect(
      overrides.engine?.backgroundState?.PerpsController?.perpsBalances,
    ).toMatchObject({
      hyperliquid: { totalBalance: '100' },
      lighter: { totalBalance: '0' },
    });
  });

  it('lists ETH on both exchanges with the position on Lighter', () => {
    const { streamOverrides } = perpsTwoExchangeState('sameMarketOnBoth');

    expect(streamOverrides.marketData).toMatchObject([
      { symbol: 'ETH', providerId: 'hyperliquid' },
      { symbol: 'ETH', providerId: 'lighter' },
    ]);
    expect(streamOverrides.positions).toMatchObject([
      { symbol: 'ETH', providerId: 'lighter' },
    ]);
  });

  it('keeps the combined account consistent with the Lighter position', () => {
    const { streamOverrides } = perpsTwoExchangeState('sameMarketOnBoth');

    expect(streamOverrides.account).toMatchObject({
      totalBalance: '150',
      marginUsed: '8.33',
      unrealizedPnl: '1',
      spendableBalance: '141.67',
    });
    expect(streamOverrides.positions).toMatchObject([
      { marginUsed: '8.33', unrealizedPnl: '1' },
    ]);
  });
});

describe.each<[string, string | undefined]>([
  ['unset', undefined],
  ['false', 'false'],
])('withLighterBuildEnabled when the flag starts %s', (_label, start) => {
  const original = process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;

  beforeAll(() => {
    if (start === undefined) {
      delete process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
    } else {
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = start;
    }
  });

  afterAll(() => {
    if (original === undefined) {
      delete process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
    } else {
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = original;
    }
  });

  describe('inside the helper block', () => {
    withLighterBuildEnabled();

    it('turns the flag on', () => {
      expect(process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED).toBe('true');
    });
  });

  describe('after the helper block', () => {
    it('restores the starting value', () => {
      expect(process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED).toBe(start);
    });
  });
});
