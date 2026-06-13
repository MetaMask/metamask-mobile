import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import {
  buildOutcomeCardModels,
  collectCardModelTokenIds,
  formatOutcomeCardTitle,
  getSportsMarketTypeLabel,
  resolveCardPricing,
} from './outcomeCardModel';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.sports_market_types.moneyline': 'Moneyline',
      'predict.sports_market_types.total_corners': 'Corners',
    };

    return translations[key] ?? key;
  }),
}));

const createToken = (
  overrides: Partial<PredictOutcomeToken> = {},
): PredictOutcomeToken =>
  ({
    id: 'token-1',
    title: 'Token',
    shortTitle: 'TKN',
    price: 0.5,
    ...overrides,
  }) as PredictOutcomeToken;

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    marketId: 'market-1',
    providerId: 'polymarket',
    title: 'Outcome',
    groupItemTitle: 'Outcome',
    status: 'open',
    volume: 1000,
    sportsMarketType: 'moneyline',
    tokens: [createToken({ id: 'yes-token' }), createToken({ id: 'no-token' })],
    ...overrides,
  }) as PredictOutcome;

const createGroup = (
  overrides: Partial<PredictOutcomeGroup> = {},
): PredictOutcomeGroup => ({
  key: 'game_lines',
  outcomes: [],
  ...overrides,
});

describe('outcomeCardModel', () => {
  it('formats over/under titles down to the player or subject name', () => {
    expect(
      formatOutcomeCardTitle(
        createOutcome({ groupItemTitle: 'Player One: Points O/U 24.5' }),
      ),
    ).toBe('Player One');
    expect(
      formatOutcomeCardTitle(
        createOutcome({ groupItemTitle: 'Total Corners: O/U 8.5' }),
      ),
    ).toBe('Total Corners');
  });

  it('uses i18n sports labels and readable fallbacks', () => {
    expect(getSportsMarketTypeLabel('moneyline')).toBe('Moneyline');
    expect(getSportsMarketTypeLabel('soccer_player_shots_on_target')).toBe(
      'Shots on Target',
    );
  });

  it('builds subgroup card models by card shape', () => {
    const moneylineOutcomes = [
      createOutcome({
        id: 'home',
        tokens: [createToken({ id: 'home-yes' })],
      }),
      createOutcome({
        id: 'away',
        tokens: [createToken({ id: 'away-yes' })],
      }),
    ];
    const lineOutcomes = [
      createOutcome({
        id: 'corners-85',
        sportsMarketType: 'total_corners',
        groupItemTitle: 'Total Corners: O/U 8.5',
        line: 8.5,
        volume: 100,
        tokens: [createToken({ id: 'over-85' })],
      }),
      createOutcome({
        id: 'corners-95',
        sportsMarketType: 'total_corners',
        groupItemTitle: 'Total Corners: O/U 9.5',
        line: 9.5,
        volume: 500,
        tokens: [createToken({ id: 'over-95' })],
      }),
    ];

    const cardModels = buildOutcomeCardModels(
      createGroup({
        subgroups: [
          { key: 'moneyline', outcomes: moneylineOutcomes },
          { key: 'total_corners', outcomes: lineOutcomes },
          {
            key: 'exact_score',
            title: 'Exact Score',
            outcomes: [
              createOutcome({
                id: 'exact-score',
                sportsMarketType: 'soccer_exact_score',
              }),
            ],
          },
        ],
      }),
    );

    expect(
      cardModels.map(({ kind, key, title }) => ({ kind, key, title })),
    ).toEqual([
      { kind: 'moneyline', key: 'moneyline', title: 'Moneyline' },
      { kind: 'line', key: 'total_corners', title: 'Corners' },
      { kind: 'simple', key: 'exact-score', title: 'Exact Score' },
    ]);
  });

  it('resolves moneyline pricing from primary tokens only', () => {
    const [cardModel] = buildOutcomeCardModels(
      createGroup({
        outcomes: [
          createOutcome({
            id: 'home',
            tokens: [
              createToken({ id: 'home-yes' }),
              createToken({ id: 'home-no' }),
            ],
          }),
          createOutcome({
            id: 'away',
            tokens: [
              createToken({ id: 'away-yes' }),
              createToken({ id: 'away-no' }),
            ],
          }),
        ],
      }),
    );

    expect(resolveCardPricing(cardModel).tokenIds).toEqual([
      'home-yes',
      'away-yes',
    ]);
    expect(collectCardModelTokenIds([cardModel])).toEqual([
      'home-yes',
      'home-no',
      'away-yes',
      'away-no',
    ]);
  });

  it('resolves selected line pricing from the selected outcome', () => {
    const [cardModel] = buildOutcomeCardModels(
      createGroup({
        subgroups: [
          {
            key: 'total_corners',
            outcomes: [
              createOutcome({
                id: 'corners-85',
                sportsMarketType: 'total_corners',
                line: 8.5,
                volume: 100,
                tokens: [createToken({ id: 'over-85' })],
              }),
              createOutcome({
                id: 'corners-95',
                sportsMarketType: 'total_corners',
                line: 9.5,
                volume: 500,
                tokens: [createToken({ id: 'over-95' })],
              }),
            ],
          },
        ],
      }),
    );

    expect(resolveCardPricing(cardModel).tokenIds).toEqual(['over-95']);
    expect(resolveCardPricing(cardModel, 0).queries).toEqual([
      {
        marketId: 'market-1',
        outcomeId: 'corners-85',
        outcomeTokenId: 'over-85',
      },
    ]);
  });
});
