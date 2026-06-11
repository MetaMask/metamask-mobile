import { renderHook } from '@testing-library/react-native';
import { TEST_HEX_COLORS } from '../../../testUtils/mockColors';
import {
  Recurrence,
  type PredictMarket,
  type PredictMarketGame,
  type PredictOutcome,
} from '../../../types';
import {
  getMoneylineTeamTokens,
  useGameLiveMarkets,
} from './useGameLiveMarkets';

const game: PredictMarketGame = {
  id: 'game-1',
  startTime: '2026-06-10T00:00:00Z',
  status: 'ongoing',
  league: 'nba',
  elapsed: '8:00',
  period: 'Q3',
  score: { away: 70, home: 72, raw: '70-72' },
  homeTeam: {
    id: 'team-nyk',
    name: 'New York Knicks',
    logo: '',
    abbreviation: 'NYK',
    color: TEST_HEX_COLORS.TEAM_GSW,
    alias: 'Knicks',
  },
  awayTeam: {
    id: 'team-sas',
    name: 'San Antonio Spurs',
    logo: '',
    abbreviation: 'SAS',
    color: TEST_HEX_COLORS.PURE_BLACK,
    alias: 'Spurs',
  },
};

const buildOutcome = (overrides: Partial<PredictOutcome>): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Outcome',
  description: '',
  image: '',
  status: 'open',
  tokens: [],
  volume: 100,
  groupItemTitle: 'Outcome',
  ...overrides,
});

const moneylineOutcome = buildOutcome({
  id: 'outcome-moneyline',
  sportsMarketType: 'moneyline',
  tokens: [
    { id: 'token-nyk', title: 'Knicks', shortTitle: 'NYK', price: 0.46 },
    { id: 'token-sas', title: 'Spurs', shortTitle: 'SAS', price: 0.54 },
  ],
});

const spreadOutcome = buildOutcome({
  id: 'outcome-spread',
  sportsMarketType: 'spreads',
  line: -1.5,
  tokens: [
    { id: 'token-spread-yes', title: 'NYK', price: 0.42 },
    { id: 'token-spread-no', title: 'SAS', price: 0.58 },
  ],
});

const buildMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'nba-sas-nyk-2026-06-10',
  title: 'Spurs @ Knicks',
  description: '',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: [],
  outcomes: [moneylineOutcome, spreadOutcome],
  liquidity: 0,
  volume: 0,
  game,
  ...overrides,
});

describe('getMoneylineTeamTokens', () => {
  it('matches home and away tokens by team name', () => {
    const result = getMoneylineTeamTokens(buildMarket(), game);

    expect(result?.outcome.id).toBe('outcome-moneyline');
    expect(result?.homeToken?.id).toBe('token-nyk');
    expect(result?.awayToken?.id).toBe('token-sas');
  });

  it('matches tokens by shortTitle abbreviation when titles do not match', () => {
    const market = buildMarket({
      outcomes: [
        buildOutcome({
          id: 'outcome-moneyline',
          sportsMarketType: 'moneyline',
          tokens: [
            { id: 'token-a', title: 'Team A', shortTitle: 'SAS', price: 0.5 },
            { id: 'token-b', title: 'Team B', shortTitle: 'NYK', price: 0.5 },
          ],
        }),
      ],
    });

    const result = getMoneylineTeamTokens(market, game);

    expect(result?.homeToken?.id).toBe('token-b');
    expect(result?.awayToken?.id).toBe('token-a');
  });

  it('returns null when the market has no outcomes', () => {
    expect(
      getMoneylineTeamTokens(buildMarket({ outcomes: [] }), game),
    ).toBeNull();
  });
});

describe('useGameLiveMarkets', () => {
  it('returns empty results when no market is loaded', () => {
    const { result } = renderHook(() => useGameLiveMarkets(undefined));

    expect(result.current).toEqual({
      moneyline: null,
      feedMarkets: {},
      outcomeGroups: [],
    });
  });

  it('buckets outcomes by sports market type for the feed', () => {
    const { result } = renderHook(() => useGameLiveMarkets(buildMarket()));

    expect(result.current.feedMarkets.moneyline).toHaveLength(1);
    expect(result.current.feedMarkets.spread).toHaveLength(1);
    expect(result.current.feedMarkets.total).toHaveLength(0);
  });

  it('excludes non-open outcomes from feed markets', () => {
    const market = buildMarket({
      outcomes: [
        moneylineOutcome,
        buildOutcome({
          id: 'outcome-closed-spread',
          sportsMarketType: 'spreads',
          status: 'closed',
        }),
      ],
    });

    const { result } = renderHook(() => useGameLiveMarkets(market));

    expect(result.current.feedMarkets.spread).toHaveLength(0);
  });

  it('falls back to local outcome grouping when outcomeGroups are absent', () => {
    const { result } = renderHook(() => useGameLiveMarkets(buildMarket()));

    expect(result.current.outcomeGroups.length).toBeGreaterThan(0);
    expect(result.current.outcomeGroups[0].key).toBe('game_lines');
  });

  it('prefers provider-attached outcomeGroups when present', () => {
    const providerGroups = [
      { key: 'provider-group', outcomes: [moneylineOutcome] },
    ];
    const market = buildMarket({ outcomeGroups: providerGroups });

    const { result } = renderHook(() => useGameLiveMarkets(market));

    expect(result.current.outcomeGroups).toBe(providerGroups);
  });
});
