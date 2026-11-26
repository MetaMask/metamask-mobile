import { withLighterBuildEnabled } from '../helpers/perpsViewTestHelpers';
import {
  perpsTwoExchangeState,
  type PerpsTwoExchangeScenario,
} from './perpsTwoExchangePresets';

describe('perpsTwoExchangeState', () => {
  it.each<[PerpsTwoExchangeScenario, string, string[]]>([
    ['bothFunded', '150', ['hyperliquid', 'lighter']],
    ['oneFunded', '100', ['hyperliquid', 'lighter']],
    ['sameMarketOnBoth', '150', ['hyperliquid', 'lighter']],
    ['lighterDown', '100', ['hyperliquid']],
  ])('%s totals %s with data for %j', (scenario, total, providers) => {
    const { overrides, streamOverrides } = perpsTwoExchangeState(scenario);
    const perps = overrides.engine?.backgroundState?.PerpsController;

    expect(perps).toMatchObject({
      activeProvider: 'aggregated',
      isEligible: true,
    });
    expect(Object.keys(perps?.perpsBalances ?? {})).toEqual(providers);
    expect(streamOverrides.account).toMatchObject({ totalBalance: total });
    expect(
      (streamOverrides.marketData ?? []).map(
        (market) => (market as { providerId: string }).providerId,
      ),
    ).toEqual(providers);
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

  it.each<[PerpsTwoExchangeScenario, 'partial' | 'complete']>([
    ['bothFunded', 'complete'],
    ['oneFunded', 'complete'],
    ['sameMarketOnBoth', 'complete'],
    ['lighterDown', 'partial'],
  ])('%s carries %s aggregate-completeness metadata', (scenario, status) => {
    const { streamOverrides } = perpsTwoExchangeState(scenario);

    // The stream override and the account snapshot agree on completeness.
    expect(streamOverrides.aggregate).toMatchObject({ status });
    expect(streamOverrides.account).toMatchObject({
      aggregate: streamOverrides.aggregate,
    });
  });

  it('marks a funded venue available with its own snapshot', () => {
    const { streamOverrides } = perpsTwoExchangeState('bothFunded');

    const { providerStates } = streamOverrides.account as {
      providerStates: Record<
        string,
        { status: string; providerId: string; state?: { totalBalance: string } }
      >;
    };
    expect(providerStates.hyperliquid).toMatchObject({
      status: 'available',
      providerId: 'hyperliquid',
      state: { totalBalance: '100' },
    });
    expect(providerStates.lighter).toMatchObject({
      status: 'available',
      providerId: 'lighter',
      state: { totalBalance: '50' },
    });
  });

  it('gives a down venue no verdict instead of a zero balance', () => {
    const { streamOverrides } = perpsTwoExchangeState('lighterDown');

    const { providerStates } = streamOverrides.account as {
      providerStates: Record<
        string,
        { status: string; providerId: string; state?: unknown }
      >;
    };
    expect(providerStates.lighter).toEqual({
      status: 'unavailable',
      providerId: 'lighter',
    });
    expect('state' in providerStates.lighter).toBe(false);
    expect(streamOverrides.aggregate).toMatchObject({
      status: 'partial',
      availableProviders: ['hyperliquid'],
      unavailableProviders: ['lighter'],
    });
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
