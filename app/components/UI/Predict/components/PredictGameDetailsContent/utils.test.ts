import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import Logger from '../../../../../util/Logger';
import {
  buildButtons,
  buildMoneylineButtons,
  buildMoneylineSubtitle,
  buildSubtitle,
  formatOutcomeCardTitle,
  getSportsMarketTypeLabel,
  sortMoneylineOutcomes,
} from './utils';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.sports_market_types.moneyline': 'Moneyline',
      'predict.sports_market_types.spreads': 'Spreads',
      'predict.sports_market_types.totals': 'Totals',
      'predict.sports_market_types.points': 'Points',
      'predict.sports_market_types.basketball_total_points': 'Totals',
      'predict.sports_market_types.basketball_odd_even': 'Odd/Even Score',
      'predict.sports_market_types.basketball_team_to_score_first':
        'Team to Score First',
      'predict.sports_market_types.tennis_set_totals': 'Total Sets',
      'predict.sports_market_types.tennis_set_handicap': 'Set Handicap',
      'predict.sports_market_types.tennis_match_totals': 'Total Games',
      'predict.sports_market_types.tennis_first_set_totals':
        '1st Set Total Games',
      'predict.sports_market_types.tennis_first_set_winner': '1st Set Winner',
      'predict.sports_market_types.tennis_completed_match': 'Completed Match',
    };
    if (key.startsWith('predict.sports_market_types.basketball_')) {
      return translations[key] ?? `[missing "${key}" translation]`;
    }
    return translations[key] ?? key;
  }),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const createToken = (
  overrides: Partial<PredictOutcomeToken> = {},
): PredictOutcomeToken =>
  ({
    id: 'token-1',
    title: 'Team A',
    shortTitle: 'TA',
    price: 0.65,
    ...overrides,
  }) as PredictOutcomeToken;

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    marketId: 'market-1',
    title: 'Team A vs Team B',
    groupItemTitle: 'Team A vs Team B',
    status: 'open',
    volume: 50000,
    sportsMarketType: 'moneyline',
    tokens: [
      createToken({
        id: 'token-a',
        title: 'Team A',
        shortTitle: 'TA',
        price: 0.65,
      }),
      createToken({
        id: 'token-b',
        title: 'Team B',
        shortTitle: 'TB',
        price: 0.35,
      }),
    ],
    ...overrides,
  }) as PredictOutcome;

const mockGame: PredictMarketGame = {
  id: 'game-1',
  homeTeam: {
    id: 'team-home',
    name: 'Team A',
    abbreviation: 'TA',
    color: TEST_HEX_COLORS.PURE_RED,
    alias: 'Team A',
    logo: 'https://example.com/logo-a.png',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Team B',
    abbreviation: 'TB',
    color: TEST_HEX_COLORS.PURE_BLUE,
    alias: 'Team B',
    logo: 'https://example.com/logo-b.png',
  },
  startTime: '2024-12-31T20:00:00Z',
  status: 'scheduled' as const,
  league: 'nfl' as const,
  elapsed: null,
  period: null,
  score: null,
};

const mockOnBuyPress = jest.fn();

describe('PredictGameDetailsContent utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSportsMarketTypeLabel', () => {
    it('returns translated label for known type', () => {
      expect(getSportsMarketTypeLabel('moneyline')).toBe('Moneyline');
    });

    it('returns translated label for basketball and tennis market types', () => {
      expect(getSportsMarketTypeLabel('basketball_odd_even')).toBe(
        'Odd/Even Score',
      );
      expect(getSportsMarketTypeLabel('tennis_match_totals')).toBe(
        'Total Games',
      );
      expect(getSportsMarketTypeLabel('tennis_first_set_winner')).toBe(
        '1st Set Winner',
      );
    });

    it('returns title-cased fallback for unknown type', () => {
      expect(getSportsMarketTypeLabel('unknown_type')).toBe('Unknown Type');
    });

    it('returns provided fallback when translation is missing', () => {
      expect(
        getSportsMarketTypeLabel('basketball_unknown_market', 'Fallback Title'),
      ).toBe('Fallback Title');
    });

    it('logs missing translations only once per key', () => {
      const mockLoggerError = jest.mocked(Logger.error);
      const type = 'basketball_logged_once_market';
      const key = `predict.sports_market_types.${type}`;
      const message = `Missing Predict sports market type translation: ${key}`;

      expect(getSportsMarketTypeLabel(type, 'Fallback Title')).toBe(
        'Fallback Title',
      );
      expect(getSportsMarketTypeLabel(type, 'Fallback Title')).toBe(
        'Fallback Title',
      );

      expect(mockLoggerError).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ message }),
        { message, context: { key, type } },
      );
    });
  });

  describe('formatOutcomeCardTitle', () => {
    it('strips O/U suffix from card title', () => {
      const outcome = createOutcome({
        groupItemTitle: 'O/U 45.5 : Points (Over/Under)',
      });

      expect(formatOutcomeCardTitle(outcome)).toBe('O/U 45.5');
    });

    it('extracts player name from O/U title with colon separator', () => {
      const outcome = createOutcome({
        groupItemTitle: 'Dean Wade: Points O/U 0.5',
      });

      expect(formatOutcomeCardTitle(outcome)).toBe('Dean Wade');
    });

    it('preserves title when no O/U colon pattern exists', () => {
      const outcome = createOutcome({ groupItemTitle: 'Player Props' });

      expect(formatOutcomeCardTitle(outcome)).toBe('Player Props');
    });

    it('falls back to outcome.title when groupItemTitle is missing', () => {
      const outcome = createOutcome({
        groupItemTitle: undefined,
        title: 'Fallback Title',
      });

      expect(formatOutcomeCardTitle(outcome)).toBe('Fallback Title');
    });

    it('strips O/U suffix when title has colon but no player pattern match', () => {
      const outcome = createOutcome({ groupItemTitle: 'Total: O/U 2.5' });

      expect(formatOutcomeCardTitle(outcome)).toBe('Total');
    });
  });

  describe('buildButtons', () => {
    it('converts token price to cents and uses shortTitle when available', () => {
      const outcome = createOutcome({
        tokens: [
          createToken({ price: 0.65, shortTitle: 'TA' }),
          createToken({ price: 0.35, shortTitle: 'TB' }),
        ],
      });

      const buttons = buildButtons(outcome, mockOnBuyPress);

      expect(buttons[0].price).toBe(65);
      expect(buttons[0].label).toBe('TA');
      expect(buttons[1].price).toBe(35);
      expect(buttons[1].label).toBe('TB');
    });

    it('falls back to title when shortTitle is missing', () => {
      const outcome = createOutcome({
        tokens: [
          createToken({ title: 'Full Team Name', shortTitle: undefined }),
        ],
      });

      expect(buildButtons(outcome, mockOnBuyPress)[0].label).toBe(
        'Full Team Name',
      );
    });

    it('assigns moneyline variants and team colors', () => {
      const twoButtonOutcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [
          createToken({ shortTitle: 'TA' }),
          createToken({ shortTitle: 'TB' }),
        ],
      });
      const threeButtonOutcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [
          createToken({ id: 't1', shortTitle: 'TA' }),
          createToken({ id: 't2', shortTitle: 'Draw' }),
          createToken({ id: 't3', shortTitle: 'TB' }),
        ],
      });

      const twoButtons = buildButtons(
        twoButtonOutcome,
        mockOnBuyPress,
        mockGame,
        'moneyline',
      );
      const threeButtons = buildButtons(
        threeButtonOutcome,
        mockOnBuyPress,
        mockGame,
        'moneyline',
      );

      expect(twoButtons[0].variant).toBe('yes');
      expect(twoButtons[1].variant).toBe('no');
      expect(twoButtons[0].teamColor).toBe(TEST_HEX_COLORS.PURE_RED);
      expect(twoButtons[1].teamColor).toBe(TEST_HEX_COLORS.PURE_BLUE);
      expect(threeButtons[1].variant).toBe('draw');
    });

    it('assigns draw variant and no team colors for non-moneyline types', () => {
      const buttons = buildButtons(
        createOutcome({
          sportsMarketType: 'spreads',
          tokens: [
            createToken({ shortTitle: 'TA' }),
            createToken({ shortTitle: 'TB' }),
          ],
        }),
        mockOnBuyPress,
        mockGame,
        'spreads',
      );

      expect(buttons[0].variant).toBe('draw');
      expect(buttons[1].variant).toBe('draw');
      expect(buttons[0].teamColor).toBeUndefined();
      expect(buttons[1].teamColor).toBeUndefined();
    });

    it('returns undefined team color for unknown abbreviations or missing game', () => {
      const unknownAbbrButtons = buildButtons(
        createOutcome({
          sportsMarketType: 'moneyline',
          tokens: [createToken({ shortTitle: 'UNKNOWN' })],
        }),
        mockOnBuyPress,
        mockGame,
        'moneyline',
      );
      const noGameButtons = buildButtons(
        createOutcome({
          sportsMarketType: 'moneyline',
          tokens: [createToken({ shortTitle: 'TA' })],
        }),
        mockOnBuyPress,
        undefined,
        'moneyline',
      );

      expect(unknownAbbrButtons[0].teamColor).toBeUndefined();
      expect(noGameButtons[0].teamColor).toBeUndefined();
    });

    it('assigns tennis first set winner team colors from normalized token labels', () => {
      const tennisGame: PredictMarketGame = {
        ...mockGame,
        league: 'atp',
        homeTeam: {
          ...mockGame.homeTeam,
          name: 'Ilya Ivashka',
          abbreviation: 'ivashka',
          alias: 'I. Ivashka',
          color: TEST_HEX_COLORS.PURE_RED,
        },
        awayTeam: {
          ...mockGame.awayTeam,
          name: 'Hamish Stewart',
          abbreviation: 'stewart',
          alias: 'H. Stewart',
          color: TEST_HEX_COLORS.PURE_BLUE,
        },
      };
      const buttons = buildButtons(
        createOutcome({
          sportsMarketType: 'tennis_first_set_winner',
          tokens: [
            createToken({ shortTitle: 'IVASHKA' }),
            createToken({ shortTitle: 'STEWART' }),
          ],
        }),
        mockOnBuyPress,
        tennisGame,
        'tennis_first_set_winner',
      );

      expect(buttons[0].teamColor).toBe(TEST_HEX_COLORS.PURE_RED);
      expect(buttons[1].teamColor).toBe(TEST_HEX_COLORS.PURE_BLUE);
    });

    it('calls onBuyPress with outcome and token when button is pressed', () => {
      const token = createToken({ id: 'tok-press', shortTitle: 'TA' });
      const outcome = createOutcome({ id: 'out-press', tokens: [token] });

      buildButtons(outcome, mockOnBuyPress)[0].onPress();

      expect(mockOnBuyPress).toHaveBeenCalledWith(outcome, token);
    });
  });

  describe('buildSubtitle', () => {
    it.each([
      [50000, '$50k Vol'],
      [2500000, '$2.5M Vol'],
    ])('formats volume %i as %s', (volume, expected) => {
      expect(buildSubtitle(createOutcome({ volume }))).toBe(expected);
    });
  });

  describe('buildMoneylineSubtitle', () => {
    it('sums volumes from all outcomes', () => {
      const outcomes = [
        createOutcome({ volume: 10000 }),
        createOutcome({ volume: 20000 }),
      ];

      expect(buildMoneylineSubtitle(outcomes)).toBe('$30k Vol');
    });
  });

  describe('sortMoneylineOutcomes', () => {
    it('places home team first, draw middle, away last when game is provided', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-draw',
          groupItemTitle: 'Draw',
          tokens: [createToken({ shortTitle: 'Draw', price: 0.2 })],
        }),
        createOutcome({
          id: 'ml-away',
          groupItemTitle: 'Away Win',
          tokens: [createToken({ shortTitle: 'TB', price: 0.3 })],
        }),
        createOutcome({
          id: 'ml-home',
          groupItemTitle: 'Home Win',
          tokens: [createToken({ shortTitle: 'TA', price: 0.5 })],
        }),
      ];

      const sorted = sortMoneylineOutcomes(outcomes, mockGame);

      expect(sorted.map((o) => o.tokens[0]?.shortTitle)).toEqual([
        'TA',
        'Draw',
        'TB',
      ]);
    });

    it('places draw second when no game is provided and no thresholds', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-draw',
          groupItemTitle: 'Draw',
          tokens: [createToken({ shortTitle: 'Draw', price: 0.2 })],
        }),
        createOutcome({
          id: 'ml-first',
          groupItemTitle: 'Team X',
          tokens: [createToken({ shortTitle: 'TX', price: 0.4 })],
        }),
        createOutcome({
          id: 'ml-second',
          groupItemTitle: 'Team Y',
          tokens: [createToken({ shortTitle: 'TY', price: 0.4 })],
        }),
      ];

      const sorted = sortMoneylineOutcomes(outcomes);

      expect(sorted.map((o) => o.tokens[0]?.shortTitle)).toEqual([
        'TX',
        'Draw',
        'TY',
      ]);
    });

    it('preserves original order when draw is present but fewer than 2 non-draw outcomes', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-draw',
          groupItemTitle: 'Draw',
          tokens: [createToken({ shortTitle: 'Draw', price: 0.5 })],
        }),
        createOutcome({
          id: 'ml-only',
          groupItemTitle: 'Team X',
          tokens: [createToken({ shortTitle: 'TX', price: 0.5 })],
        }),
      ];

      const sorted = sortMoneylineOutcomes(outcomes, mockGame);

      expect(sorted.map((o) => o.tokens[0]?.shortTitle)).toEqual([
        'Draw',
        'TX',
      ]);
    });

    it('sorts by groupItemThreshold when thresholds are present', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-2',
          groupItemThreshold: 2,
          tokens: [createToken({ shortTitle: 'AWY', price: 0.25 })],
        }),
        createOutcome({
          id: 'ml-0',
          groupItemThreshold: 0,
          tokens: [createToken({ shortTitle: 'HOM', price: 0.55 })],
        }),
        createOutcome({
          id: 'ml-1',
          groupItemThreshold: 1,
          tokens: [createToken({ shortTitle: 'Draw', price: 0.2 })],
        }),
      ];

      const buttons = buildMoneylineButtons(outcomes, mockOnBuyPress, mockGame);

      expect(buttons.map((button) => button.label)).toEqual([
        'HOM',
        'Draw',
        'AWY',
      ]);
      expect(buttons.map((button) => button.price)).toEqual([55, 20, 25]);
      expect(buttons.map((button) => button.variant)).toEqual([
        'yes',
        'draw',
        'no',
      ]);
    });
  });

  describe('buildMoneylineButtons', () => {
    it('uses live best ask prices when available', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-a',
          tokens: [createToken({ id: 'tok-a', shortTitle: 'TA', price: 0.45 })],
        }),
        createOutcome({
          id: 'ml-b',
          tokens: [createToken({ id: 'tok-b', shortTitle: 'TB', price: 0.55 })],
        }),
      ];
      const getPrice = jest.fn((tokenId: string) => ({
        tokenId,
        price: 0,
        bestBid: 0,
        bestAsk: tokenId === 'tok-a' ? 0.76 : 0.24,
      }));

      const buttons = buildMoneylineButtons(
        outcomes,
        mockOnBuyPress,
        mockGame,
        getPrice,
      );

      expect(buttons[0].price).toBe(76);
      expect(buttons[1].price).toBe(24);
    });

    it('falls back to static token price when live best ask is zero', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-a',
          tokens: [createToken({ id: 'tok-a', shortTitle: 'TA', price: 0.45 })],
        }),
      ];
      const getPrice = jest.fn(() => ({
        tokenId: 'tok-a',
        price: 0,
        bestBid: 0,
        bestAsk: 0,
      }));

      const buttons = buildMoneylineButtons(
        outcomes,
        mockOnBuyPress,
        mockGame,
        getPrice,
      );

      expect(buttons[0].price).toBe(45);
    });

    it('skips outcomes without tokens', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-empty',
          tokens: [],
        }),
        createOutcome({
          id: 'ml-home',
          groupItemThreshold: 0,
          tokens: [createToken({ shortTitle: 'HOM', price: 0.6 })],
        }),
        createOutcome({
          id: 'ml-away',
          groupItemThreshold: 1,
          tokens: [createToken({ shortTitle: 'AWY', price: 0.4 })],
        }),
      ];

      const buttons = buildMoneylineButtons(outcomes, mockOnBuyPress, mockGame);

      expect(buttons.map((button) => button.label)).toEqual(['HOM', 'AWY']);
    });
  });
});
