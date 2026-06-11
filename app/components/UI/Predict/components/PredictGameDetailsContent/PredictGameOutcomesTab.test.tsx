import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGameOutcomesTab, {
  getSportsMarketTypeLabel,
} from './PredictGameOutcomesTab';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import type { PredictSportOutcomeButton } from '../PredictSportOutcomeCard';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import Logger from '../../../../../util/Logger';

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

const mockGetLivePrice = jest.fn();

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
    ])('returns translated label for %s', (marketType, expected) => {
      expect(getSportsMarketTypeLabel(marketType)).toBe(expected);
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

    it('renders nothing for a group without subgroups', () => {
      const { getByTestId } = renderTab({
        key: 'game_lines',
        outcomes: [],
      });

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
      expect(mockCapturedCards).toHaveLength(0);
    });
  });

  describe('simple card (single outcome)', () => {
    it('renders a single outcome as a simple card with the provider title', () => {
      const tab = createTab('exact_score', [
        createCard({
          key: 'soccer_exact_score-0',
          title: 'Mexico 1 - 0 South Africa',
          outcomes: [
            createOutcome({
              id: 'es-1',
              sportsMarketType: 'soccer_exact_score',
              groupItemTitle: 'Mexico 1 - 0 South Africa',
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].title).toBe('Mexico 1 - 0 South Africa');
      expect(mockCapturedCards[0].lines).toBeUndefined();
      expect(mockCapturedCards[0].testID).toBe(
        'exact_score-soccer_exact_score-0',
      );
    });

    it('prefers the provider-supplied card title (player single line)', () => {
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
    });

    it('formats volume into the subtitle', () => {
      const tab = createTab('exact_score', [
        createCard({
          key: 'soccer_exact_score-0',
          outcomes: [
            createOutcome({
              id: 'es-1',
              sportsMarketType: 'soccer_exact_score',
              groupItemTitle: 'Draw',
              volume: 2500000,
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].subtitle).toBe('$2.5M Vol');
    });

    it('builds buttons with cent prices and calls onBuyPress', () => {
      const token = createToken({ id: 'tok-press', shortTitle: 'TA' });
      const outcome = createOutcome({
        id: 'out-press',
        sportsMarketType: 'soccer_exact_score',
        groupItemTitle: 'Draw',
        tokens: [
          token,
          createToken({ id: 'tok-b', shortTitle: 'TB', price: 0.35 }),
        ],
      });
      const tab = createTab('exact_score', [
        createCard({ key: 'soccer_exact_score-0', outcomes: [outcome] }),
      ]);

      const { getByTestId } = renderTab(tab);

      expect(mockCapturedCards[0].buttons[0].price).toBe(65);
      expect(mockCapturedCards[0].buttons[0].label).toBe('TA');

      fireEvent(
        getByTestId('exact_score-soccer_exact_score-0-btn-0'),
        'touchEnd',
      );
      expect(mockOnBuyPress).toHaveBeenCalledWith(outcome, token);
    });
  });

  describe('line card (multiple outcomes)', () => {
    const lineOutcomes = [
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
    ];

    it('renders a line selector titled by the market-type label', () => {
      const tab = createTab('corners', [
        createCard({ key: 'total_corners', outcomes: lineOutcomes }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].title).toBe('Corners');
      expect(mockCapturedCards[0].lines).toEqual([8.5, 9.5]);
      expect(mockCapturedCards[0].selectedLine).toBe(9.5);
      expect(mockCapturedCards[0].testID).toBe('corners-total_corners');
    });

    it('uses the provider card title for split line cards (team totals)', () => {
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
      expect(mockCapturedCards[0].lines).toEqual([0.5, 1.5]);
    });

    it('sorts lines ascending regardless of outcome order', () => {
      const tab = createTab('corners', [
        createCard({
          key: 'total_corners',
          outcomes: [
            createOutcome({ id: 's1', sportsMarketType: 'totals', line: 7.5 }),
            createOutcome({ id: 's2', sportsMarketType: 'totals', line: 3.5 }),
            createOutcome({ id: 's3', sportsMarketType: 'totals', line: 10.5 }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].lines).toEqual([3.5, 7.5, 10.5]);
      expect(mockCapturedCards[0].selectedLine).toBe(3.5);
    });

    it('switches the displayed outcome when a line is selected', () => {
      const tab = createTab('corners', [
        createCard({ key: 'total_corners', outcomes: lineOutcomes }),
      ]);

      const { getByTestId } = renderTab(tab);

      expect(mockCapturedCards[0].buttons[0].price).toBe(42);

      mockCapturedCards = [];
      fireEvent(getByTestId('corners-total_corners-line-0-8.5'), 'touchEnd');

      expect(mockCapturedCards[0].buttons[0].price).toBe(53);
    });

    it('assigns draw variant and no team color for non-moneyline lines', () => {
      const tab = createTab('corners', [
        createCard({ key: 'total_corners', outcomes: lineOutcomes }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].buttons[0].variant).toBe('draw');
      expect(mockCapturedCards[0].buttons[0].teamColor).toBeUndefined();
    });
  });

  describe('moneyline card', () => {
    const moneylineOutcomes = [
      createOutcome({
        id: 'ml-home',
        sportsMarketType: 'moneyline',
        groupItemThreshold: 0,
        groupItemTitle: 'Home Win',
        volume: 5000,
        tokens: [createToken({ id: 't-hom', shortTitle: 'TA', price: 0.55 })],
      }),
      createOutcome({
        id: 'ml-draw',
        sportsMarketType: 'moneyline',
        groupItemThreshold: 1,
        groupItemTitle: 'Draw',
        volume: 2000,
        tokens: [createToken({ id: 't-draw', shortTitle: 'Draw', price: 0.2 })],
      }),
      createOutcome({
        id: 'ml-away',
        sportsMarketType: 'moneyline',
        groupItemThreshold: 2,
        groupItemTitle: 'Away Win',
        volume: 3000,
        tokens: [createToken({ id: 't-awy', shortTitle: 'TB', price: 0.25 })],
      }),
    ];

    const moneylineTab = createTab('game_lines', [
      createCard({ key: 'moneyline', outcomes: moneylineOutcomes }),
    ]);

    it('renders an inline card titled by the market-type label', () => {
      renderTab(moneylineTab);

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      expect(mockCapturedCards[0].title).toBe('Moneyline');
      expect(mockCapturedCards[0].testID).toBe('game_lines-moneyline');
    });

    it('sums volumes from all outcomes into the subtitle', () => {
      renderTab(moneylineTab);

      expect(mockCapturedCards[0].subtitle).toBe('$10k Vol');
    });

    it('sorts outcomes by threshold (home, draw, away) with variants', () => {
      renderTab(moneylineTab);

      expect(mockCapturedCards[0].buttons.map((b) => b.label)).toEqual([
        'TA',
        'Draw',
        'TB',
      ]);
      expect(mockCapturedCards[0].buttons.map((b) => b.variant)).toEqual([
        'yes',
        'draw',
        'no',
      ]);
    });

    it('assigns team colors from the game', () => {
      renderTab(moneylineTab);

      expect(mockCapturedCards[0].buttons[0].teamColor).toBe(
        TEST_HEX_COLORS.PURE_RED,
      );
      expect(mockCapturedCards[0].buttons[2].teamColor).toBe(
        TEST_HEX_COLORS.PURE_BLUE,
      );
    });

    it('uses live best ask prices when available', () => {
      mockGetLivePrice.mockImplementation((tokenId: string) => ({
        tokenId,
        price: 0,
        bestBid: 0,
        bestAsk: tokenId === 't-hom' ? 0.76 : 0,
      }));

      renderTab(moneylineTab);

      expect(mockCapturedCards[0].buttons[0].price).toBe(76);
    });

    it('calls onBuyPress with the outcome and its yes token', () => {
      const { getByTestId } = renderTab(moneylineTab);

      fireEvent(getByTestId('game_lines-moneyline-btn-1'), 'touchEnd');

      expect(mockOnBuyPress).toHaveBeenCalledWith(
        moneylineOutcomes[1],
        moneylineOutcomes[1].tokens[0],
      );
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

    it('centers a "Neither" outcome in a first-to-score card', () => {
      const tab = createTab('game_lines', [
        createCard({
          key: 'soccer_first_to_score',
          outcomes: [
            createOutcome({
              id: 'fts-mex',
              sportsMarketType: 'soccer_first_to_score',
              groupItemTitle: 'Mexico',
              groupItemThreshold: 0,
              tokens: [
                createToken({ id: 'm', shortTitle: 'MEX', price: 0.73 }),
              ],
            }),
            createOutcome({
              id: 'fts-neither',
              sportsMarketType: 'soccer_first_to_score',
              groupItemTitle: 'Neither',
              groupItemThreshold: 2,
              tokens: [
                createToken({ id: 'n', shortTitle: 'Neither', price: 0.09 }),
              ],
            }),
            createOutcome({
              id: 'fts-rsa',
              sportsMarketType: 'soccer_first_to_score',
              groupItemTitle: 'South Africa',
              groupItemThreshold: 1,
              tokens: [
                createToken({ id: 'r', shortTitle: 'RSA', price: 0.24 }),
              ],
            }),
          ],
        }),
      ]);

      renderTab(tab);

      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      // Neither is centered despite its threshold ordering it last.
      expect(mockCapturedCards[0].buttons.map((b) => b.label)).toEqual([
        'MEX',
        'Neither',
        'RSA',
      ]);
      expect(mockCapturedCards[0].buttons.map((b) => b.variant)).toEqual([
        'yes',
        'draw',
        'no',
      ]);
    });

    it('labels a two-way (single-outcome) moneyline card as "Moneyline"', () => {
      // Tennis / baseball moneyline is one market with two tokens, so the card
      // has a single outcome. It must still be titled by its market type, not
      // the raw market question.
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

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].buttonLayout).toBeUndefined();
      expect(mockCapturedCards[0].title).toBe('Moneyline');
    });
  });
});
