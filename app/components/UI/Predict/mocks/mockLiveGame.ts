import {
  Recurrence,
  type GameUpdate,
  type PredictMarket,
  type PredictMarketGame,
  type PredictOutcome,
  type PredictSportTeam,
} from '../types';
import { TEST_HEX_COLORS } from '../testUtils/mockColors';

/**
 * Fully mocked live NBA game + market for demoing the Game Live screen when no
 * real game is in progress (deeplink `&mock=true`). Order placement is
 * disabled in mock mode — these outcomes/tokens are not real Polymarket
 * markets.
 */

export const MOCK_LIVE_GAME_ID = 'mock-game-sas-nyk';
const MOCK_MARKET_ID = 'mock-market-sas-nyk';

const MOCK_AWAY_TEAM: PredictSportTeam = {
  id: 'mock-team-sas',
  name: 'San Antonio Spurs',
  logo: 'https://i.imgur.com/0Y0F0Zs.png',
  abbreviation: 'SAS',
  color: TEST_HEX_COLORS.PURE_BLACK,
  alias: 'Spurs',
};

const MOCK_HOME_TEAM: PredictSportTeam = {
  id: 'mock-team-nyk',
  name: 'New York Knicks',
  logo: 'https://i.imgur.com/8wKQ3yL.png',
  abbreviation: 'NYK',
  color: TEST_HEX_COLORS.TEAM_GSW,
  alias: 'Knicks',
};

export const MOCK_LIVE_GAME: PredictMarketGame = {
  id: MOCK_LIVE_GAME_ID,
  startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  status: 'ongoing',
  league: 'nba',
  elapsed: '8:42',
  period: 'Q3',
  score: { away: 78, home: 81, raw: '78-81' },
  homeTeam: MOCK_HOME_TEAM,
  awayTeam: MOCK_AWAY_TEAM,
};

const baseOutcome = {
  providerId: 'polymarket',
  marketId: MOCK_MARKET_ID,
  description: '',
  image: '',
  status: 'open' as const,
  active: true,
  acceptingOrders: true,
  negRisk: false,
};

const moneylineOutcome: PredictOutcome = {
  ...baseOutcome,
  id: 'mock-outcome-moneyline',
  title: 'Spurs vs. Knicks',
  groupItemTitle: 'Moneyline',
  sportsMarketType: 'moneyline',
  volume: 32_220_000,
  liquidity: 1_500_000,
  tokens: [
    { id: 'mock-token-ml-sas', title: 'Spurs', shortTitle: 'SAS', price: 0.54 },
    {
      id: 'mock-token-ml-nyk',
      title: 'Knicks',
      shortTitle: 'NYK',
      price: 0.46,
    },
  ],
};

const buildLineOutcome = (
  kind: 'spreads' | 'totals',
  line: number,
  yesPrice: number,
): PredictOutcome => ({
  ...baseOutcome,
  id: `mock-outcome-${kind}-${line}`,
  title:
    kind === 'spreads' ? `Knicks ${line > 0 ? '+' : ''}${line}` : `O/U ${line}`,
  groupItemTitle:
    kind === 'spreads' ? `NYK ${line > 0 ? '+' : ''}${line}` : `${line}`,
  sportsMarketType: kind,
  line,
  volume: 8_700_000,
  liquidity: 600_000,
  tokens: [
    {
      id: `mock-token-${kind}-${line}-yes`,
      title: kind === 'spreads' ? 'NYK' : 'Over',
      shortTitle: kind === 'spreads' ? 'NYK' : 'Over',
      price: yesPrice,
    },
    {
      id: `mock-token-${kind}-${line}-no`,
      title: kind === 'spreads' ? 'SAS' : 'Under',
      shortTitle: kind === 'spreads' ? 'SAS' : 'Under',
      price: Number((1 - yesPrice).toFixed(2)),
    },
  ],
});

export const MOCK_LIVE_GAME_MARKET: PredictMarket = {
  id: MOCK_MARKET_ID,
  providerId: 'polymarket',
  slug: 'nba-sas-nyk-mock',
  title: 'Spurs @ Knicks',
  description: 'Mock NBA game for the Game Live demo.',
  image: '',
  status: 'open',
  active: true,
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['nba', 'games'],
  liquidity: 2_500_000,
  volume: 32_220_000,
  game: MOCK_LIVE_GAME,
  outcomes: [
    moneylineOutcome,
    buildLineOutcome('spreads', -1.5, 0.42),
    buildLineOutcome('spreads', 1.5, 0.58),
    buildLineOutcome('totals', 219.5, 0.51),
    buildLineOutcome('totals', 224.5, 0.38),
  ],
};

/**
 * Scripted anchor sequence the mock driver cycles through, simulating real
 * sports-WebSocket updates (score in "away-home" format for NBA).
 */
export const MOCK_GAME_UPDATE_SCRIPT: Omit<GameUpdate, 'gameId'>[] = [
  { score: '78-81', elapsed: '8:42', period: 'Q3', status: 'ongoing' },
  { score: '80-81', elapsed: '7:55', period: 'Q3', status: 'ongoing' },
  { score: '80-84', elapsed: '6:48', period: 'Q3', status: 'ongoing' },
  { score: '83-84', elapsed: '5:30', period: 'Q3', status: 'ongoing' },
  { score: '85-86', elapsed: '3:58', period: 'Q3', status: 'ongoing' },
  { score: '87-89', elapsed: '1:12', period: 'Q3', status: 'ongoing' },
  { score: '89-89', elapsed: '12:00', period: 'Q4', status: 'ongoing' },
  { score: '92-91', elapsed: '10:21', period: 'Q4', status: 'ongoing' },
  { score: '94-95', elapsed: '8:02', period: 'Q4', status: 'ongoing' },
  { score: '99-97', elapsed: '5:47', period: 'Q4', status: 'ongoing' },
  { score: '101-101', elapsed: '2:36', period: 'Q4', status: 'ongoing' },
  { score: '105-105', elapsed: '0:30', period: 'Q4', status: 'ongoing' },
];

export const buildMockGameUpdate = (stepIndex: number): GameUpdate => {
  const step =
    MOCK_GAME_UPDATE_SCRIPT[
      Math.min(stepIndex, MOCK_GAME_UPDATE_SCRIPT.length - 1)
    ];
  return { gameId: MOCK_LIVE_GAME_ID, ...step };
};
