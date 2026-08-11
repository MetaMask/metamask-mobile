import {
  PredictPositionStatus,
  Recurrence,
  type PredictMarket,
  type PredictPosition,
} from '../../../app/components/UI/Predict/types';

export const MOCK_PREDICT_MARKET: PredictMarket = {
  id: 'market-btc-1',
  providerId: 'polymarket',
  slug: 'will-btc-reach-100k',
  title: 'Will Bitcoin reach $100k?',
  description: 'Will Bitcoin reach $100k by end of year?',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'trending',
  tags: [],
  outcomes: [
    {
      id: 'outcome-yes',
      providerId: 'polymarket',
      marketId: 'market-btc-1',
      title: 'Will Bitcoin reach $100k?',
      description: '',
      image: '',
      status: 'open',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.65 },
        { id: 'token-no', title: 'No', price: 0.35 },
      ],
      volume: 1_000_000,
      groupItemTitle: 'Yes',
    },
  ],
  liquidity: 500_000,
  volume: 1_000_000,
};

/**
 * Closed binary market resolved to "Yes".
 *
 * `useOutcomeResolution` derives the winner from a token priced at exactly 1 and
 * the loser from a token priced at exactly 0, so those prices are load-bearing.
 */
export const MOCK_PREDICT_CLOSED_MARKET: PredictMarket = {
  ...MOCK_PREDICT_MARKET,
  id: 'market-closed-1',
  slug: 'will-btc-reach-100k-closed',
  status: 'closed',
  outcomes: [
    {
      ...MOCK_PREDICT_MARKET.outcomes[0],
      marketId: 'market-closed-1',
      status: 'closed',
      resolutionStatus: 'resolved',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 1 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
    },
  ],
};

/** Open market with three outcomes, which surfaces the Outcomes tab. */
export const MOCK_PREDICT_MULTI_OUTCOME_MARKET: PredictMarket = {
  ...MOCK_PREDICT_MARKET,
  id: 'market-multi-1',
  slug: 'who-wins-the-election',
  title: 'Who will win the election?',
  outcomes: ['Alice', 'Bob', 'Carol'].map((candidate, index) => ({
    id: `outcome-${candidate.toLowerCase()}`,
    providerId: 'polymarket',
    marketId: 'market-multi-1',
    title: candidate,
    description: '',
    image: '',
    status: 'open' as const,
    tokens: [
      { id: `token-${candidate.toLowerCase()}`, title: 'Yes', price: 0.3 },
      { id: `token-${candidate.toLowerCase()}-no`, title: 'No', price: 0.7 },
    ],
    volume: 100_000 * (index + 1),
    groupItemTitle: candidate,
  })),
};

/**
 * Open market where one of the outcomes has already resolved, which renders the
 * collapsible "Resolved outcomes" section alongside the still-open outcomes.
 */
export const MOCK_PREDICT_PARTIALLY_RESOLVED_MARKET: PredictMarket = {
  ...MOCK_PREDICT_MULTI_OUTCOME_MARKET,
  id: 'market-partial-1',
  slug: 'who-wins-the-election-partial',
  outcomes: MOCK_PREDICT_MULTI_OUTCOME_MARKET.outcomes.map((outcome, index) =>
    index === 2
      ? {
          ...outcome,
          marketId: 'market-partial-1',
          status: 'closed' as const,
          resolutionStatus: 'resolved',
        }
      : { ...outcome, marketId: 'market-partial-1' },
  ),
};

/**
 * Builds a position for the default market fixture. Override `claimable` and
 * `percentPnl` to drive the claim CTA (shown for claimable positions in profit).
 */
export const buildMockPredictPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-btc-1',
  outcomeId: 'outcome-yes',
  outcome: 'Yes',
  outcomeTokenId: 'token-yes',
  currentValue: 60,
  title: 'Will Bitcoin reach $100k?',
  icon: '',
  amount: 100,
  price: 0.65,
  status: PredictPositionStatus.OPEN,
  size: 50,
  outcomeIndex: 0,
  percentPnl: 20,
  cashPnl: 10,
  claimable: false,
  initialValue: 50,
  avgPrice: 0.5,
  endDate: '2026-12-31',
  ...overrides,
});

/** Scoreboard-capable live sports market for Live Now / sport-card view tests. */
export const MOCK_PREDICT_LIVE_SPORT_MARKET: PredictMarket = {
  id: 'market-live-sport-1',
  providerId: 'polymarket',
  slug: 'spain-vs-england-live',
  title: 'Spain vs England',
  description: 'Live World Cup matchup between Spain and England',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['World Cup'],
  outcomes: [
    {
      id: 'outcome-game-winner',
      providerId: 'polymarket',
      marketId: 'market-live-sport-1',
      title: 'Game Winner',
      description: 'Who will win the game',
      image: '',
      status: 'open',
      tokens: [
        { id: 'token-home', title: 'Spain', price: 0.6 },
        { id: 'token-draw', title: 'Draw', price: 0.15 },
        { id: 'token-away', title: 'England', price: 0.62 },
      ],
      volume: 1_000_000,
      groupItemTitle: '',
    },
  ],
  liquidity: 500_000,
  volume: 1_000_000,
  game: {
    id: 'game-live-1',
    startTime: '2026-06-08T21:30:00Z',
    status: 'ongoing',
    league: 'fifwc',
    elapsed: "45'",
    period: '1H',
    score: { home: 1, away: 0, raw: '0-1' },
    awayTeam: {
      id: 'england',
      name: 'England',
      logo: 'https://example.com/england.png',
      abbreviation: 'ENG',
      color: '#FF0000',
      alias: 'England',
    },
    homeTeam: {
      id: 'spain',
      name: 'Spain',
      logo: 'https://example.com/spain.png',
      abbreviation: 'SPA',
      color: '#FF8800',
      alias: 'Spain',
    },
  },
};
