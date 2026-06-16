import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import {
  buildOutcomeCardModels,
  getSportsMarketTypeLabel,
} from './outcomeCardModel';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.sports_market_types.moneyline': 'Moneyline',
      'predict.sports_market_types.total_corners': 'Corners',
      'predict.sports_market_types.soccer_player_goals': 'Goals',
      'predict.sports_market_types.soccer_player_goalkeeper_saves': 'Saves',
      'predict.sports_market_types.basketball_odd_even': 'Odd/Even Score',
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
    tokens: [createToken({ id: 'token-a' }), createToken({ id: 'token-b' })],
    ...overrides,
  }) as PredictOutcome;

const createCard = (
  overrides: Partial<PredictOutcomeGroup> = {},
): PredictOutcomeGroup => ({
  key: 'moneyline',
  outcomes: [createOutcome()],
  ...overrides,
});

describe('outcomeCardModel', () => {
  describe('getSportsMarketTypeLabel', () => {
    it.each([
      ['moneyline', undefined, 'Moneyline'],
      ['basketball_odd_even', undefined, 'Odd/Even Score'],
      ['soccer_player_goalkeeper_saves', undefined, 'Saves'],
      ['unknown_type', undefined, 'Unknown Type'],
      ['basketball_unknown_market', 'Fallback Title', 'Fallback Title'],
    ])('labels %s', (marketType, fallbackTitle, expected) => {
      expect(getSportsMarketTypeLabel(marketType, fallbackTitle)).toBe(
        expected,
      );
    });
  });

  describe('buildOutcomeCardModels', () => {
    it('builds moneyline, simple, and line models from provider groups', () => {
      const group: PredictOutcomeGroup = {
        key: 'game_lines',
        outcomes: [],
        subgroups: [
          createCard({
            key: 'moneyline',
            outcomes: [
              createOutcome({
                id: 'moneyline-home',
                tokens: [createToken({ id: 'ml-home' })],
              }),
              createOutcome({
                id: 'moneyline-away',
                tokens: [createToken({ id: 'ml-away' })],
              }),
            ],
          }),
          createCard({
            key: 'soccer_player_goals-0',
            title: 'Player One',
            outcomes: [
              createOutcome({
                id: 'player-goals',
                sportsMarketType: 'soccer_player_goals',
                groupItemTitle: 'Player One: 1+ goals',
              }),
            ],
          }),
          createCard({
            key: 'total_corners',
            outcomes: [
              createOutcome({
                id: 'corners-85',
                sportsMarketType: 'total_corners',
                groupItemTitle: 'Total Corners: O/U 8.5',
                line: 8.5,
              }),
              createOutcome({
                id: 'corners-95',
                sportsMarketType: 'total_corners',
                groupItemTitle: 'Total Corners: O/U 9.5',
                line: 9.5,
              }),
            ],
          }),
        ],
      };

      expect(buildOutcomeCardModels(group)).toEqual([
        expect.objectContaining({
          kind: 'moneyline',
          key: 'moneyline',
          title: 'Moneyline',
        }),
        expect.objectContaining({
          kind: 'simple',
          key: 'player-goals',
          title: 'Player One',
        }),
        expect.objectContaining({
          kind: 'line',
          key: 'total_corners',
          title: 'Corners',
        }),
      ]);
    });
  });
});
