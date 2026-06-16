import React from 'react';
import { render } from '@testing-library/react-native';
import PredictGameOutcomesTab from './PredictGameOutcomesTab';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import type { PredictSportOutcomeButton } from '../PredictSportOutcomeCard';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';

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

const mockGetLivePrice = jest.fn();
const mockOnVisiblePriceQueriesChange = jest.fn();

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
      getPrice={mockGetLivePrice}
      onVisiblePriceQueriesChange={mockOnVisiblePriceQueriesChange}
      onBuyPress={mockOnBuyPress}
    />,
  );

describe('PredictGameOutcomesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLivePrice.mockReturnValue(undefined);
    mockOnVisiblePriceQueriesChange.mockClear();
    mockCapturedCards = [];
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
          getPrice={mockGetLivePrice}
          onVisiblePriceQueriesChange={mockOnVisiblePriceQueriesChange}
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
});
