import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
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

jest.mock('../../../../../core/Engine', () => {
  const mockContext = {
    PredictController: {
      getPrices: jest.fn(),
    },
  };

  return {
    context: mockContext,
  };
});

const mockGetPrices = jest.mocked(Engine.context.PredictController.getPrices);

const mockUsePredictPreviewSheet = jest.fn(() => ({
  isBuySheetOpen: false,
}));

jest.mock('../../contexts', () => ({
  usePredictPreviewSheet: () => mockUsePredictPreviewSheet(),
}));

const emptyPriceResponse = { providerId: '', results: [] };

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
  selectedIndex?: number;
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
  selectedIndex?: number;
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
      selectedIndex: props.selectedIndex,
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

const createGroup = (
  overrides: Partial<PredictOutcomeGroup> = {},
): PredictOutcomeGroup => ({
  key: 'game_lines',
  outcomes: [createOutcome()],
  ...overrides,
});

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

describe('PredictGameOutcomesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPreviewSheet.mockReturnValue({
      isBuySheetOpen: false,
    });
    mockGetLivePrice.mockReturnValue(undefined);
    mockGetPrices.mockResolvedValue(emptyPriceResponse);
    mockCapturedCards = [];
  });

  describe('group selection', () => {
    it('renders nothing inside container when no group matches activeChipKey', () => {
      const groups = [createGroup({ key: 'game_lines' })];

      const { getByTestId, queryByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="nonexistent_key"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
      expect(queryByTestId('game_lines-outcome-0')).toBeNull();
    });

    it('renders the matched group outcomes when activeChipKey matches', () => {
      const groups = [
        createGroup({ key: 'game_lines' }),
        createGroup({ key: 'touchdowns' }),
      ];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(getByTestId('game_lines-outcome-0')).toBeOnTheScreen();
    });
  });

  describe('flat outcomes (no subgroups)', () => {
    it('renders SimpleOutcomeCard for each outcome', () => {
      const outcomes = [
        createOutcome({ id: 'o1', volume: 1000, sportsMarketType: 'points' }),
        createOutcome({ id: 'o2', volume: 2000, sportsMarketType: 'points' }),
      ];
      const groups = [createGroup({ key: 'points', outcomes })];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="points"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(getByTestId('points-outcome-0')).toBeOnTheScreen();
      expect(getByTestId('points-outcome-1')).toBeOnTheScreen();
    });
  });

  describe('subgroups', () => {
    it('renders SubgroupCards for each subgroup', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'moneyline',
          outcomes: [createOutcome({ id: 'ml-1' })],
        }),
        createGroup({
          key: 'spreads',
          outcomes: [createOutcome({ id: 'sp-1' })],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(getByTestId('game_lines-moneyline-0')).toBeOnTheScreen();
      expect(getByTestId('game_lines-spreads-1')).toBeOnTheScreen();
    });

    it('renders SimpleOutcomeCard for subgroup with single outcome', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'moneyline',
          outcomes: [createOutcome({ id: 'ml-single' })],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].title).toBe('Moneyline');
      expect(mockCapturedCards[0].lines).toBeUndefined();
    });

    it('renders LineOutcomeCard for subgroup with multiple outcomes', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({ id: 'sp-1', line: 3.5 }),
            createOutcome({ id: 'sp-2', line: 7.5 }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].lines).toEqual([3.5, 7.5]);
      expect(mockCapturedCards[0].selectedLine).toBe(3.5);
    });

    it('assigns first_half_moneyline variants through subgroup routing', () => {
      const outcome = createOutcome({
        sportsMarketType: 'first_half_moneyline',
        tokens: [
          createToken({ shortTitle: 'TA' }),
          createToken({ shortTitle: 'TB' }),
        ],
      });
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'first_half_moneyline',
          outcomes: [outcome],
        }),
      ];
      const groups = [
        createGroup({ key: 'first_half', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="first_half"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].variant).toBe('yes');
      expect(mockCapturedCards[0].buttons[0].teamColor).toBe(
        TEST_HEX_COLORS.PURE_RED,
      );
    });

    it('uses outcome title when subgroup market type translation is missing', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'basketball_unknown_market',
          outcomes: [
            createOutcome({
              id: 'odd-even',
              groupItemTitle: 'Odd/Even',
              title: 'Odd/Even',
            }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].title).toBe('Odd/Even');
    });

    it('uses selected line title when line market type translation is missing', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'basketball_unknown_line_market',
          outcomes: [
            createOutcome({
              id: 'total-198',
              line: 198.5,
              groupItemTitle: 'Total Points 198.5',
              title: 'Total Points 198.5',
            }),
            createOutcome({
              id: 'total-199',
              line: 199.5,
              groupItemTitle: 'Total Points 199.5',
              title: 'Total Points 199.5',
            }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].title).toBe('Total Points 198.5');

      mockCapturedCards = [];
      fireEvent(
        getByTestId('game_lines-basketball_unknown_line_market-0-line-1-199.5'),
        'touchEnd',
      );

      expect(mockCapturedCards[0].title).toBe('Total Points 199.5');
    });
  });

  describe('line selection', () => {
    it('preserves incoming line order', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({ id: 's1', line: 7.5 }),
            createOutcome({ id: 's2', line: 3.5 }),
            createOutcome({ id: 's3', line: 10.5 }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].lines).toEqual([7.5, 3.5, 10.5]);
    });

    it('defaults selected line to the highest volume outcome', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({
              id: 's1',
              line: 7.5,
              volume: 1000,
              liquidity: 10000,
            }),
            createOutcome({
              id: 's2',
              line: 3.5,
              volume: 5000,
              liquidity: 50,
            }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].selectedLine).toBe(3.5);
      expect(mockCapturedCards[0].selectedIndex).toBe(1);
    });

    it('switches displayed outcome when line is selected', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({
              id: 's1',
              line: 3.5,
              volume: 5000,
              tokens: [
                createToken({ shortTitle: 'TA', price: 0.6 }),
                createToken({ shortTitle: 'TB', price: 0.4 }),
              ],
            }),
            createOutcome({
              id: 's2',
              line: 7.5,
              volume: 1000,
              tokens: [
                createToken({ shortTitle: 'TA', price: 0.8 }),
                createToken({ shortTitle: 'TB', price: 0.2 }),
              ],
            }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].price).toBe(60);

      mockCapturedCards = [];
      fireEvent(getByTestId('game_lines-spreads-0-line-1-7.5'), 'touchEnd');

      expect(mockCapturedCards[0].buttons[0].price).toBe(80);
    });

    it('selects duplicate line labels by index', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({
              id: 'spread-plus-2.5',
              line: -2.5,
              tokens: [createToken({ shortTitle: 'TA +2.5', price: 0.9 })],
            }),
            createOutcome({
              id: 'spread-plus-1.5',
              line: -1.5,
              tokens: [createToken({ shortTitle: 'TA +1.5', price: 0.8 })],
            }),
            createOutcome({
              id: 'spread-minus-1.5',
              line: -1.5,
              tokens: [createToken({ shortTitle: 'TA -1.5', price: 0.6 })],
            }),
            createOutcome({
              id: 'spread-minus-2.5',
              line: -2.5,
              tokens: [createToken({ shortTitle: 'TA -2.5', price: 0.4 })],
            }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].lines).toEqual([2.5, 1.5, 1.5, 2.5]);

      mockCapturedCards = [];
      fireEvent(getByTestId('game_lines-spreads-0-line-2-1.5'), 'touchEnd');

      expect(mockCapturedCards[0].selectedLine).toBe(1.5);
      expect(mockCapturedCards[0].selectedIndex).toBe(2);
      expect(mockCapturedCards[0].buttons[0].price).toBe(60);
    });
  });

  describe('empty states', () => {
    it('renders container with empty groups array', () => {
      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap([])}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
      expect(mockCapturedCards).toHaveLength(0);
    });
  });

  describe('moneyline subgroup rendering', () => {
    it('renders inline-spaced card for moneyline subgroup with multiple outcomes sorted by threshold', () => {
      const outcomes = [
        createOutcome({
          id: 'ml-2',
          groupItemThreshold: 2,
          groupItemTitle: 'Away Win',
          volume: 3000,
          tokens: [createToken({ shortTitle: 'AWY', price: 0.25 })],
        }),
        createOutcome({
          id: 'ml-0',
          groupItemThreshold: 0,
          groupItemTitle: 'Home Win',
          volume: 5000,
          tokens: [createToken({ shortTitle: 'HOM', price: 0.55 })],
        }),
        createOutcome({
          id: 'ml-1',
          groupItemThreshold: 1,
          groupItemTitle: 'Draw',
          volume: 2000,
          tokens: [createToken({ shortTitle: 'Draw', price: 0.2 })],
        }),
      ];
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({ key: 'moneyline', outcomes }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      expect(mockCapturedCards[0].buttons[0].label).toBe('HOM');
      expect(mockCapturedCards[0].buttons[0].price).toBe(55);
      expect(mockCapturedCards[0].buttons[0].variant).toBe('yes');
      expect(mockCapturedCards[0].buttons[1].label).toBe('Draw');
      expect(mockCapturedCards[0].buttons[1].price).toBe(20);
      expect(mockCapturedCards[0].buttons[1].variant).toBe('draw');
      expect(mockCapturedCards[0].buttons[2].label).toBe('AWY');
      expect(mockCapturedCards[0].buttons[2].price).toBe(25);
      expect(mockCapturedCards[0].buttons[2].variant).toBe('no');
    });

    it('uses live best ask prices for moneyline buttons', () => {
      mockGetLivePrice.mockImplementation((tokenId: string) => ({
        tokenId,
        price: 0,
        bestBid: 0,
        bestAsk: tokenId === 'tok-a' ? 0.76 : 0.24,
      }));

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
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({ key: 'moneyline', outcomes }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].price).toBe(76);
      expect(mockCapturedCards[0].buttons[1].price).toBe(24);
    });

    it('calls onBuyPress with correct outcome and token for moneyline button', () => {
      const tokenA = createToken({ id: 'tok-a', shortTitle: 'TA', price: 0.6 });
      const tokenB = createToken({ id: 'tok-b', shortTitle: 'TB', price: 0.4 });
      const outcomeA = createOutcome({
        id: 'ml-a',
        groupItemThreshold: 0,
        volume: 1000,
        tokens: [tokenA],
      });
      const outcomeB = createOutcome({
        id: 'ml-b',
        groupItemThreshold: 1,
        volume: 1000,
        tokens: [tokenB],
      });
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({ key: 'moneyline', outcomes: [outcomeA, outcomeB] }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      fireEvent(getByTestId('game_lines-moneyline-0-btn-1'), 'touchEnd');

      expect(mockOnBuyPress).toHaveBeenCalledWith(outcomeB, tokenB);
    });
  });

  describe('flat outcomes moneyline rendering', () => {
    it('renders single inline-spaced card for moneyline-like group without subgroups', () => {
      const outcomes = [
        createOutcome({
          id: 'hr-1',
          sportsMarketType: 'soccer_halftime_result',
          groupItemTitle: 'Home',
          volume: 4000,
          tokens: [createToken({ shortTitle: 'HOM', price: 0.5 })],
        }),
        createOutcome({
          id: 'hr-2',
          sportsMarketType: 'soccer_halftime_result',
          groupItemTitle: 'Away',
          volume: 6000,
          tokens: [createToken({ shortTitle: 'AWY', price: 0.3 })],
        }),
        createOutcome({
          id: 'hr-3',
          sportsMarketType: 'soccer_halftime_result',
          groupItemTitle: 'Draw',
          volume: 5000,
          tokens: [createToken({ shortTitle: 'Draw', price: 0.2 })],
        }),
      ];
      const groups = [createGroup({ key: 'halftime', outcomes })];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="halftime"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      expect(mockCapturedCards[0].testID).toBe('halftime-moneyline');
      expect(mockCapturedCards[0].subtitle).toBe('$15k Vol');
    });

    it('renders individual cards when flat group has only one outcome with moneyline type', () => {
      const outcomes = [
        createOutcome({
          id: 'hr-single',
          sportsMarketType: 'soccer_halftime_result',
          volume: 4000,
          tokens: [createToken({ shortTitle: 'HOM', price: 0.5 })],
        }),
      ];
      const groups = [createGroup({ key: 'halftime', outcomes })];

      render(
        <PredictGameOutcomesTab
          groupMap={toGroupMap(groups)}
          game={mockGame}
          activeChipKey="halftime"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].buttonLayout).toBeUndefined();
    });
  });
});
