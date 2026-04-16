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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.sports_market_types.moneyline': 'Moneyline',
      'predict.sports_market_types.spreads': 'Spreads',
      'predict.sports_market_types.totals': 'Totals',
      'predict.sports_market_types.points': 'Points',
    };
    return translations[key] ?? key;
  }),
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
  lines?: number[];
  selectedLine?: number;
  testID?: string;
}

let mockCapturedCards: CapturedCard[] = [];

interface MockCardProps {
  title: string;
  subtitle?: string;
  buttons: PredictSportOutcomeButton[];
  lines?: number[];
  selectedLine?: number;
  onSelectLine?: (line: number) => void;
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
          props.lines.map((line: number) => (
            <View
              key={line}
              testID={`${props.testID}-line-${line}`}
              onTouchEnd={() => props.onSelectLine?.(line)}
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
    mockCapturedCards = [];
  });

  describe('getSportsMarketTypeLabel', () => {
    it('returns translated label for known type', () => {
      expect(getSportsMarketTypeLabel('moneyline')).toBe('Moneyline');
    });

    it('returns i18n key for unknown type', () => {
      expect(getSportsMarketTypeLabel('unknown_type')).toBe(
        'predict.sports_market_types.unknown_type',
      );
    });
  });

  describe('group selection', () => {
    it('renders outcomes content container', () => {
      const groups = [createGroup({ key: 'game_lines' })];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
    });

    it('renders nothing inside container when no group matches activeChipKey', () => {
      const groups = [createGroup({ key: 'game_lines' })];

      const { getByTestId, queryByTestId } = render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
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
          outcomeGroups={groups}
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
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="points"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(getByTestId('points-outcome-0')).toBeOnTheScreen();
      expect(getByTestId('points-outcome-1')).toBeOnTheScreen();
    });

    it('uses formatOutcomeCardTitle to strip O/U suffix from card title', () => {
      const outcome = createOutcome({
        id: 'o-ou',
        groupItemTitle: 'O/U 45.5 : Points (Over/Under)',
      });
      const groups = [createGroup({ key: 'points', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="points"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].title).toBe('O/U 45.5');
    });

    it('preserves title when no O/U colon pattern exists', () => {
      const outcome = createOutcome({
        id: 'o-plain',
        groupItemTitle: 'Player Props',
      });
      const groups = [createGroup({ key: 'points', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="points"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].title).toBe('Player Props');
    });

    it('falls back to outcome.title when groupItemTitle is missing', () => {
      const outcome = createOutcome({
        id: 'o-notitle',
        groupItemTitle: undefined,
        title: 'Fallback Title',
      });
      const groups = [createGroup({ key: 'points', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="points"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].title).toBe('Fallback Title');
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
          outcomeGroups={groups}
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
          outcomeGroups={groups}
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
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].lines).toEqual([3.5, 7.5]);
      expect(mockCapturedCards[0].selectedLine).toBe(3.5);
    });
  });

  describe('button building', () => {
    it('converts token price to cents for button price', () => {
      const outcome = createOutcome({
        tokens: [
          createToken({ price: 0.65, shortTitle: 'TA' }),
          createToken({ price: 0.35, shortTitle: 'TB' }),
        ],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].price).toBe(65);
      expect(mockCapturedCards[0].buttons[1].price).toBe(35);
    });

    it('uses shortTitle for button label when available', () => {
      const outcome = createOutcome({
        tokens: [createToken({ title: 'Full Team Name', shortTitle: 'FTN' })],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].label).toBe('FTN');
    });

    it('falls back to title when shortTitle is missing', () => {
      const outcome = createOutcome({
        tokens: [
          createToken({ title: 'Full Team Name', shortTitle: undefined }),
        ],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].label).toBe('Full Team Name');
    });

    it('calls onBuyPress with outcome and token when button is pressed', () => {
      const token = createToken({ id: 'tok-press', shortTitle: 'TA' });
      const outcome = createOutcome({ id: 'out-press', tokens: [token] });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      const { getByTestId } = render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      fireEvent(getByTestId('game_lines-outcome-0-btn-0'), 'touchEnd');

      expect(mockOnBuyPress).toHaveBeenCalledWith(outcome, token);
    });
  });

  describe('moneyline variant and team colors', () => {
    it('assigns team colors for moneyline type', () => {
      const outcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [
          createToken({ shortTitle: 'TA', price: 0.6 }),
          createToken({ shortTitle: 'TB', price: 0.4 }),
        ],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].teamColor).toBe(
        TEST_HEX_COLORS.PURE_RED,
      );
      expect(mockCapturedCards[0].buttons[1].teamColor).toBe(
        TEST_HEX_COLORS.PURE_BLUE,
      );
    });

    it('assigns yes/no variants for 2-button moneyline', () => {
      const outcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [
          createToken({ shortTitle: 'TA' }),
          createToken({ shortTitle: 'TB' }),
        ],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].variant).toBe('yes');
      expect(mockCapturedCards[0].buttons[1].variant).toBe('no');
    });

    it('assigns draw variant for middle button in 3-button moneyline', () => {
      const outcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [
          createToken({ id: 't1', shortTitle: 'TA' }),
          createToken({ id: 't2', shortTitle: 'Draw' }),
          createToken({ id: 't3', shortTitle: 'TB' }),
        ],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].variant).toBe('yes');
      expect(mockCapturedCards[0].buttons[1].variant).toBe('draw');
      expect(mockCapturedCards[0].buttons[2].variant).toBe('no');
    });

    it('assigns first_half_moneyline as moneyline type', () => {
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
          outcomeGroups={groups}
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

    it('assigns draw variant and no team colors for non-moneyline types', () => {
      const outcome = createOutcome({
        sportsMarketType: 'spreads',
        tokens: [
          createToken({ shortTitle: 'TA' }),
          createToken({ shortTitle: 'TB' }),
        ],
      });
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({ key: 'spreads', outcomes: [outcome] }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].variant).toBe('draw');
      expect(mockCapturedCards[0].buttons[1].variant).toBe('draw');
      expect(mockCapturedCards[0].buttons[0].teamColor).toBeUndefined();
      expect(mockCapturedCards[0].buttons[1].teamColor).toBeUndefined();
    });

    it('returns undefined team color when abbreviation does not match any team', () => {
      const outcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [createToken({ shortTitle: 'UNKNOWN' })],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].teamColor).toBeUndefined();
    });

    it('returns undefined team color when game is not provided', () => {
      const outcome = createOutcome({
        sportsMarketType: 'moneyline',
        tokens: [createToken({ shortTitle: 'TA' })],
      });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={undefined}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].teamColor).toBeUndefined();
    });
  });

  describe('subtitle formatting', () => {
    it('formats volume into subtitle with dollar sign and Vol suffix', () => {
      const outcome = createOutcome({ volume: 50000 });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].subtitle).toBe('$50k Vol');
    });

    it('formats large volume with M suffix', () => {
      const outcome = createOutcome({ volume: 2500000 });
      const groups = [createGroup({ key: 'game_lines', outcomes: [outcome] })];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].subtitle).toBe('$2.5M Vol');
    });
  });

  describe('line selection', () => {
    it('sorts lines numerically in ascending order', () => {
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
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].lines).toEqual([3.5, 7.5, 10.5]);
    });

    it('defaults selected line to the first outcome line', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({ id: 's1', line: 7.5 }),
            createOutcome({ id: 's2', line: 3.5 }),
          ],
        }),
      ];
      const groups = [
        createGroup({ key: 'game_lines', outcomes: [], subgroups }),
      ];

      render(
        <PredictGameOutcomesTab
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].selectedLine).toBe(7.5);
    });

    it('switches displayed outcome when line is selected', () => {
      const subgroups: PredictOutcomeGroup[] = [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({
              id: 's1',
              line: 3.5,
              volume: 1000,
              tokens: [
                createToken({ shortTitle: 'TA', price: 0.6 }),
                createToken({ shortTitle: 'TB', price: 0.4 }),
              ],
            }),
            createOutcome({
              id: 's2',
              line: 7.5,
              volume: 5000,
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
          outcomeGroups={groups}
          game={mockGame}
          activeChipKey="game_lines"
          onBuyPress={mockOnBuyPress}
        />,
      );

      expect(mockCapturedCards[0].buttons[0].price).toBe(60);

      mockCapturedCards = [];
      fireEvent(getByTestId('game_lines-spreads-0-line-7.5'), 'touchEnd');

      expect(mockCapturedCards[0].buttons[0].price).toBe(80);
    });
  });

  describe('empty states', () => {
    it('renders container with empty groups array', () => {
      const { getByTestId } = render(
        <PredictGameOutcomesTab
          outcomeGroups={[]}
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
});
