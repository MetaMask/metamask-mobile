import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGameOutcomesTab from './PredictGameOutcomesTab';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import type { PredictSportOutcomeButton } from '../PredictSportOutcomeCard';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import Logger from '../../../../../util/Logger';
import {
  buildOutcomeCardModels,
  getSportsMarketTypeLabel,
} from './usePredictGameOutcomeRows';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.sports_market_types.moneyline': 'Moneyline',
      'predict.sports_market_types.spreads': 'Spreads',
      'predict.sports_market_types.totals': 'Totals',
      'predict.sports_market_types.total_corners': 'Corners',
      'predict.sports_market_types.points': 'Points',
      'predict.sports_market_types.first_half_moneyline': '1H Moneyline',
      'predict.sports_market_types.soccer_halftime_result': 'Halftime Result',
      'predict.sports_market_types.soccer_first_half_team_totals':
        '1st Half Team Totals',
      'predict.sports_market_types.both_teams_to_score_first_half':
        '1st Half Both Teams to Score',
      'predict.sports_market_types.soccer_second_half_result':
        '2nd Half Result',
      'predict.sports_market_types.soccer_second_half_team_totals':
        '2nd Half Team Totals',
      'predict.sports_market_types.both_teams_to_score_second_half':
        '2nd Half Both Teams to Score',
      'predict.sports_market_types.soccer_team_totals': 'Team Totals',
      'predict.sports_market_types.soccer_team_total_corners': 'Team Corners',
      'predict.sports_market_types.soccer_first_corner': 'First Corner',
      'predict.sports_market_types.soccer_game_corners_odd_even':
        'Odd/Even Corners',
      'predict.sports_market_types.soccer_player_goals': 'Goals',
      'predict.sports_market_types.soccer_player_assists': 'Assists',
      'predict.sports_market_types.soccer_player_shots': 'Shots',
      'predict.sports_market_types.soccer_player_goals_plus_assists':
        'Goals + Assists',
      'predict.sports_market_types.soccer_player_shots_on_target':
        'Shots on Target',
      'predict.sports_market_types.soccer_player_goalkeeper_saves': 'Saves',
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
      'predict.resolved_outcomes': 'Resolved outcomes',
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

const mockGetLivePrice = jest.fn();
const mockUseLiveMarketPrices = jest.mocked(useLiveMarketPrices);

jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(() => ({
    getPrice: mockGetLivePrice,
  })),
}));

const mockOnBuyPress = jest.fn();

interface CapturedCard {
  title: string;
  subtitle?: string;
  buttons: {
    label: string;
    price: number;
    variant: string;
    teamColor?: string;
  }[];
  buttonLayout?: string;
  lines?: number[];
  selectedLine?: number;
  testID?: string;
}

let mockCapturedCards: CapturedCard[] = [];

interface MockCardProps {
  title: string;
  subtitle?: string;
  buttons: PredictSportOutcomeButton[];
  buttonLayout?: string;
  lines?: number[];
  selectedLine?: number;
  onSelectLine?: (line: number, index: number) => void;
  testID?: string;
}

jest.mock('../PredictSportOutcomeCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { View, Text } = jest.requireActual('react-native');
  const MockCard = (props: MockCardProps) => {
    mockCapturedCards.push({
      title: props.title,
      subtitle: props.subtitle,
      buttons: props.buttons.map((b) => ({
        label: b.label,
        price: b.price,
        variant: b.variant,
        teamColor: b.teamColor,
      })),
      buttonLayout: props.buttonLayout,
      lines: props.lines,
      selectedLine: props.selectedLine,
      testID: props.testID,
    });
    return (
      <View testID={props.testID}>
        <Text testID={`${props.testID}-title`}>{props.title}</Text>
        <Text testID={`${props.testID}-subtitle`}>{props.subtitle}</Text>
        {props.buttons.map((button, index) => (
          <View
            key={`${button.label}-${index}`}
            testID={`${props.testID}-btn-${index}`}
            accessibilityHint={`${button.label}|${button.price}|${button.variant}|${button.teamColor ?? 'none'}`}
            onTouchEnd={button.onPress}
          />
        ))}
        {props.lines &&
          props.lines.map((line: number, lineIdx: number) => (
            <View
              key={`${lineIdx}-${line}`}
              testID={`${props.testID}-line-${lineIdx}-${line}`}
              onTouchEnd={() => props.onSelectLine?.(line, lineIdx)}
              accessibilityHint={
                line === props.selectedLine ? 'selected' : 'unselected'
              }
            />
          ))}
      </View>
    );
  };
  MockCard.displayName = 'MockPredictSportOutcomeCard';
  return {
    __esModule: true,
    default: MockCard,
  };
});

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

/** Builds a card (subgroup) as produced by the provider's buildOutcomeGroups. */
const createCard = (
  overrides: Partial<PredictOutcomeGroup> = {},
): PredictOutcomeGroup => ({
  key: 'moneyline',
  outcomes: [createOutcome()],
  ...overrides,
});

/** Builds a tab (top-level group) holding one or more cards. */
const createTab = (
  key: string,
  cards: PredictOutcomeGroup[],
): PredictOutcomeGroup => ({ key, outcomes: [], subgroups: cards });

const toGroupMap = (
  groups: PredictOutcomeGroup[],
): Map<string, PredictOutcomeGroup> => new Map(groups.map((g) => [g.key, g]));

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

const renderTab = (
  tab: PredictOutcomeGroup,
  game: PredictMarketGame | undefined = mockGame,
) =>
  render(
    <PredictGameOutcomesTab
      groupMap={toGroupMap([tab])}
      game={game}
      activeChipKey={tab.key}
      onBuyPress={mockOnBuyPress}
    />,
  );

describe('PredictGameOutcomesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLivePrice.mockReturnValue(undefined);
    mockCapturedCards = [];
    mockUseLiveMarketPrices.mockImplementation(() => ({
      getPrice: mockGetLivePrice,
      prices: new Map(),
      isConnected: true,
      lastUpdateTime: null,
    }));
  });

  describe('getSportsMarketTypeLabel', () => {
    it('returns translated label for known type', () => {
      expect(getSportsMarketTypeLabel('moneyline')).toBe('Moneyline');
    });

    it('returns translated label for basketball market types', () => {
      expect(getSportsMarketTypeLabel('basketball_odd_even')).toBe(
        'Odd/Even Score',
      );
      expect(getSportsMarketTypeLabel('basketball_team_to_score_first')).toBe(
        'Team to Score First',
      );
    });

    it.each([
      ['soccer_first_half_team_totals', '1st Half Team Totals'],
      ['both_teams_to_score_first_half', '1st Half Both Teams to Score'],
      ['soccer_second_half_team_totals', '2nd Half Team Totals'],
      ['both_teams_to_score_second_half', '2nd Half Both Teams to Score'],
      ['soccer_team_totals', 'Team Totals'],
      ['soccer_team_total_corners', 'Team Corners'],
      ['soccer_first_corner', 'First Corner'],
      ['soccer_game_corners_odd_even', 'Odd/Even Corners'],
      ['soccer_player_goals', 'Goals'],
      ['soccer_player_assists', 'Assists'],
      ['soccer_player_shots', 'Shots'],
      ['soccer_player_goals_plus_assists', 'Goals + Assists'],
      ['soccer_player_shots_on_target', 'Shots on Target'],
      ['soccer_player_goalkeeper_saves', 'Saves'],
    ])('returns translated label for %s', (marketType, expected) => {
      expect(getSportsMarketTypeLabel(marketType)).toBe(expected);
    });

    it('returns title-cased fallback for unknown type', () => {
      expect(getSportsMarketTypeLabel('unknown_type')).toBe('Unknown Type');
    });

    it('parses player market types into readable labels when translation is missing', () => {
      expect(
        getSportsMarketTypeLabel('soccer_player_goalkeeper_saves_missing'),
      ).toBe('Goalkeeper Saves Missing');
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

  describe('group selection', () => {
    it('renders the outcomes content container', () => {
      const { getByTestId } = renderTab(
        createTab('game_lines', [createCard()]),
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
    });

    it('renders nothing inside container when no group matches activeChipKey', () => {
      const { getByTestId, queryByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap([createTab('game_lines', [createCard()])])}
          game={mockGame}
          activeChipKey="nonexistent_key"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
      expect(queryByTestId('game_lines-moneyline')).toBeNull();
    });

    it('renders a card for each subgroup of the active group', () => {
      const tab = createTab('goals', [
        createCard({
          key: 'soccer_player_goals-0',
          title: 'Player One',
          outcomes: [
            createOutcome({
              id: 'p1',
              sportsMarketType: 'soccer_player_goals',
            }),
          ],
        }),
        createCard({
          key: 'soccer_player_goals-1',
          title: 'Player Two',
          outcomes: [
            createOutcome({
              id: 'p2',
              sportsMarketType: 'soccer_player_goals',
            }),
          ],
        }),
      ]);

      const { getByTestId } = renderTab(tab);

      expect(getByTestId('goals-soccer_player_goals-0')).toBeOnTheScreen();
      expect(getByTestId('goals-soccer_player_goals-1')).toBeOnTheScreen();
    });

    it('falls back to rendering flat outcomes when a group has no subgroups', () => {
      const { getByTestId } = renderTab({
        key: 'game_lines',
        outcomes: [
          createOutcome({
            id: 'flat-1',
            sportsMarketType: 'soccer_exact_score',
            groupItemTitle: 'Mexico 1 - 0 South Africa',
          }),
          createOutcome({
            id: 'flat-2',
            sportsMarketType: 'soccer_exact_score',
            groupItemTitle: 'Mexico 2 - 0 South Africa',
          }),
        ],
      });

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
      expect(mockCapturedCards).toHaveLength(2);
      expect(mockCapturedCards[0].title).toBe('Mexico 1 - 0 South Africa');
      expect(mockCapturedCards[0].testID).toBe('game_lines-outcome-0');
      expect(mockCapturedCards[1].title).toBe('Mexico 2 - 0 South Africa');
      expect(mockCapturedCards[1].testID).toBe('game_lines-outcome-1');
    });
  });

  describe('buildOutcomeCardModels', () => {
    it('builds subgroup card models with card kind and pricing ownership together', () => {
      const group = createTab('game_lines', [
        createCard({
          key: 'moneyline',
          outcomes: [
            createOutcome({
              id: 'moneyline-home',
              sportsMarketType: 'moneyline',
              tokens: [createToken({ id: 'ml-home', price: 0.6 })],
            }),
            createOutcome({
              id: 'moneyline-away',
              sportsMarketType: 'moneyline',
              tokens: [createToken({ id: 'ml-away', price: 0.4 })],
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
              tokens: [
                createToken({ id: 'player-over', shortTitle: 'Over' }),
                createToken({ id: 'player-under', shortTitle: 'Under' }),
              ],
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
              tokens: [
                createToken({ id: 'corners-over-85' }),
                createToken({ id: 'corners-under-85' }),
              ],
            }),
            createOutcome({
              id: 'corners-95',
              sportsMarketType: 'total_corners',
              groupItemTitle: 'Total Corners: O/U 9.5',
              line: 9.5,
              tokens: [
                createToken({ id: 'corners-over-95' }),
                createToken({ id: 'corners-under-95' }),
              ],
            }),
          ],
        }),
      ]);

      expect(buildOutcomeCardModels(group)).toEqual([
        {
          kind: 'moneyline',
          key: 'moneyline',
          title: 'Moneyline',
          testID: 'game_lines-moneyline',
          outcomes: group.subgroups?.[0].outcomes,
          pricing: {
            kind: 'shared',
            tokenIds: ['ml-home', 'ml-away'],
          },
        },
        {
          kind: 'simple',
          key: 'player-goals',
          title: 'Player One',
          testID: 'game_lines-soccer_player_goals-0',
          outcome: group.subgroups?.[1].outcomes[0],
          sportsMarketType: 'soccer_player_goals',
          pricing: {
            kind: 'shared',
            tokenIds: ['player-over', 'player-under'],
          },
        },
        {
          kind: 'line',
          key: 'total_corners',
          title: 'Corners',
          testID: 'game_lines-total_corners',
          outcomes: group.subgroups?.[2].outcomes,
          sportsMarketType: 'total_corners',
          pricing: {
            kind: 'selected-line',
          },
        },
      ]);
    });

    it('builds flat non-subgroup groups into simple cards with shared pricing', () => {
      const group: PredictOutcomeGroup = {
        key: 'game_lines',
        outcomes: [
          createOutcome({
            id: 'flat-1',
            sportsMarketType: 'soccer_exact_score',
            groupItemTitle: 'Mexico 1 - 0 South Africa',
            tokens: [createToken({ id: 'flat-token-1' })],
          }),
          createOutcome({
            id: 'flat-2',
            sportsMarketType: 'soccer_exact_score',
            groupItemTitle: 'Mexico 2 - 0 South Africa',
            tokens: [createToken({ id: 'flat-token-2' })],
          }),
        ],
      };

      expect(buildOutcomeCardModels(group)).toEqual([
        {
          kind: 'simple',
          key: 'flat-1',
          title: 'Mexico 1 - 0 South Africa',
          testID: 'game_lines-outcome-0',
          outcome: group.outcomes[0],
          sportsMarketType: 'soccer_exact_score',
          pricing: {
            kind: 'shared',
            tokenIds: ['flat-token-1'],
          },
        },
        {
          kind: 'simple',
          key: 'flat-2',
          title: 'Mexico 2 - 0 South Africa',
          testID: 'game_lines-outcome-1',
          outcome: group.outcomes[1],
          sportsMarketType: 'soccer_exact_score',
          pricing: {
            kind: 'shared',
            tokenIds: ['flat-token-2'],
          },
        },
      ]);
    });
  });

  describe('card model wiring', () => {
    it('prefers the provider-supplied card title for simple cards', () => {
      const tab = createTab('goals', [
        createCard({
          key: 'soccer_player_goals-0',
          title: 'Armando González',
          outcomes: [
            createOutcome({
              id: 'g-1',
              sportsMarketType: 'soccer_player_goals',
              groupItemTitle: 'Armando González: 1+ goals',
              line: 0.5,
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].title).toBe('Armando González');
      expect(mockCapturedCards[0].testID).toBe('goals-soccer_player_goals-0');
    });

    it('renders a line card titled by the market-type label', () => {
      const tab = createTab('corners', [
        createCard({
          key: 'total_corners',
          outcomes: [
            createOutcome({
              id: 'c-85',
              sportsMarketType: 'total_corners',
              groupItemTitle: 'Total Corners: O/U 8.5',
              line: 8.5,
              volume: 1000,
              tokens: [
                createToken({ id: 'o85', shortTitle: 'O 8.5', price: 0.53 }),
                createToken({ id: 'u85', shortTitle: 'U 8.5', price: 0.48 }),
              ],
            }),
            createOutcome({
              id: 'c-95',
              sportsMarketType: 'total_corners',
              groupItemTitle: 'Total Corners: O/U 9.5',
              line: 9.5,
              volume: 5000,
              tokens: [
                createToken({ id: 'o95', shortTitle: 'O 9.5', price: 0.42 }),
                createToken({ id: 'u95', shortTitle: 'U 9.5', price: 0.59 }),
              ],
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].title).toBe('Corners');
      expect(mockCapturedCards[0].testID).toBe('corners-total_corners');
    });

    it('uses the provider card title for split line cards', () => {
      const tab = createTab('game_lines', [
        createCard({
          key: 'soccer_team_totals-0',
          title: 'Mexico Totals',
          outcomes: [
            createOutcome({
              id: 'mex-05',
              sportsMarketType: 'soccer_team_totals',
              groupItemTitle: 'Mexico O/U 0.5',
              line: 0.5,
            }),
            createOutcome({
              id: 'mex-15',
              sportsMarketType: 'soccer_team_totals',
              groupItemTitle: 'Mexico O/U 1.5',
              line: 1.5,
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].title).toBe('Mexico Totals');
    });

    it('renders a moneyline card titled by the market-type label', () => {
      const tab = createTab('game_lines', [
        createCard({
          key: 'moneyline',
          outcomes: [
            createOutcome({
              id: 'ml-home',
              sportsMarketType: 'moneyline',
              groupItemThreshold: 0,
              groupItemTitle: 'Home Win',
              tokens: [createToken({ id: 't-hom', shortTitle: 'TA' })],
            }),
            createOutcome({
              id: 'ml-away',
              sportsMarketType: 'moneyline',
              groupItemThreshold: 2,
              groupItemTitle: 'Away Win',
              tokens: [createToken({ id: 't-awy', shortTitle: 'TB' })],
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].title).toBe('Moneyline');
      expect(mockCapturedCards[0].testID).toBe('game_lines-moneyline');
    });

    it('treats soccer_halftime_result as moneyline-like', () => {
      const tab = createTab('halftime', [
        createCard({
          key: 'soccer_halftime_result',
          outcomes: [
            createOutcome({
              id: 'hr-1',
              sportsMarketType: 'soccer_halftime_result',
              groupItemTitle: 'Home',
              tokens: [createToken({ shortTitle: 'TA', price: 0.5 })],
            }),
            createOutcome({
              id: 'hr-2',
              sportsMarketType: 'soccer_halftime_result',
              groupItemTitle: 'Away',
              tokens: [createToken({ shortTitle: 'TB', price: 0.3 })],
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      expect(mockCapturedCards[0].title).toBe('Halftime Result');
    });

    it('labels a two-way moneyline card as Moneyline', () => {
      const tab = createTab('game_lines', [
        createCard({
          key: 'moneyline',
          outcomes: [
            createOutcome({
              id: 'ml-single',
              sportsMarketType: 'moneyline',
              groupItemTitle: 'Libema Open: Snigur vs Udvardy',
              tokens: [
                createToken({ id: 'a', shortTitle: 'SNIGUR', price: 0.32 }),
                createToken({ id: 'b', shortTitle: 'UDVARDY', price: 0.69 }),
              ],
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].buttonLayout).toBeUndefined();
      expect(mockCapturedCards[0].title).toBe('Moneyline');
    });

    it('falls back to a flat moneyline group when no subgroups are provided', () => {
      renderTab({
        key: 'game_lines',
        outcomes: [
          createOutcome({
            id: 'ml-home',
            sportsMarketType: 'moneyline',
            groupItemThreshold: 0,
            groupItemTitle: 'Home Win',
            tokens: [createToken({ id: 't-hom', shortTitle: 'TA' })],
          }),
          createOutcome({
            id: 'ml-away',
            sportsMarketType: 'moneyline',
            groupItemThreshold: 2,
            groupItemTitle: 'Away Win',
            tokens: [createToken({ id: 't-awy', shortTitle: 'TB' })],
          }),
        ],
      });

      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      expect(mockCapturedCards[0].title).toBe('Moneyline');
      expect(mockCapturedCards[0].testID).toBe('game_lines-moneyline');
    });
  });

  describe('subscription ownership', () => {
    it('subscribes once for every token in the active group', () => {
      const tab = createTab('game_lines', [
        createCard({
          key: 'soccer_player_goals-0',
          title: 'Player One',
          outcomes: [
            createOutcome({
              id: 'player-1',
              sportsMarketType: 'soccer_player_goals',
              groupItemTitle: 'Player One: 1+ goals',
              tokens: [
                createToken({ id: 'player-over' }),
                createToken({ id: 'player-under' }),
              ],
            }),
          ],
        }),
        createCard({
          key: 'total_corners',
          outcomes: [
            createOutcome({
              id: 'line-low',
              sportsMarketType: 'total_corners',
              groupItemTitle: 'Total Corners: O/U 8.5',
              line: 8.5,
              volume: 1000,
              tokens: [
                createToken({ id: 'line-low-over' }),
                createToken({ id: 'line-low-under' }),
              ],
            }),
            createOutcome({
              id: 'line-high',
              sportsMarketType: 'total_corners',
              groupItemTitle: 'Total Corners: O/U 9.5',
              line: 9.5,
              volume: 5000,
              tokens: [
                createToken({ id: 'line-high-over' }),
                createToken({ id: 'line-high-under' }),
              ],
            }),
          ],
        }),
      ]);

      const { getByTestId } = renderTab(tab);

      const initialTokenSubscriptions = mockUseLiveMarketPrices.mock.calls.map(
        ([tokenIds]) => tokenIds,
      );
      expect(initialTokenSubscriptions).toEqual([
        [
          'player-over',
          'player-under',
          'line-low-over',
          'line-low-under',
          'line-high-over',
          'line-high-under',
        ],
      ]);

      mockUseLiveMarketPrices.mockClear();
      fireEvent(getByTestId('game_lines-total_corners-line-0-8.5'), 'touchEnd');

      expect(mockUseLiveMarketPrices).not.toHaveBeenCalled();
    });
  });

  describe('resolved outcomes', () => {
    it('renders collapsible resolved section for partially settled groups', () => {
      const tab = createTab('game_lines', [
        createCard({
          key: 'moneyline',
          outcomes: [
            createOutcome({
              id: 'moneyline-open',
              status: 'open',
              sportsMarketType: 'moneyline',
              tokens: [createToken({ id: 'ml-open', price: 0.6 })],
            }),
            createOutcome({
              id: 'moneyline-closed',
              status: 'closed',
              sportsMarketType: 'moneyline',
              groupItemTitle: 'Closed Moneyline',
              tokens: [
                createToken({ id: 'ml-closed-win', price: 1 }),
                createToken({ id: 'ml-closed-lose', price: 0 }),
              ],
            }),
          ],
        }),
      ]);

      const { getByText, queryByText, queryByTestId } = renderTab(tab);

      expect(getByText('Resolved outcomes')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(queryByTestId('game_lines-moneyline-title')).toBeTruthy();
      expect(queryByText('Closed Moneyline')).toBeNull();
      fireEvent.press(getByText('Resolved outcomes'));
      expect(getByText('Closed Moneyline')).toBeTruthy();
      expect(mockUseLiveMarketPrices.mock.calls.at(-1)?.[0]).toEqual([
        'ml-open',
      ]);
    });

    it('shows resolved outcomes in a collapsible section when the entire group is settled', () => {
      const tab = createTab('props', [
        createCard({
          key: 'player_goals',
          outcomes: [
            createOutcome({
              id: 'player-closed',
              status: 'closed',
              sportsMarketType: 'soccer_player_goals',
            }),
          ],
        }),
      ]);

      const { getByText, queryByText } = renderTab(tab);

      expect(getByText('Resolved outcomes')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(queryByText('Team A vs Team B')).toBeNull();
      fireEvent.press(getByText('Resolved outcomes'));
      expect(getByText('Team A vs Team B')).toBeTruthy();
      expect(mockCapturedCards).toHaveLength(0);
    });
  });
});
