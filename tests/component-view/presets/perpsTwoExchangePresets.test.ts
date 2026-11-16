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
});
