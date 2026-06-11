import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictGameOutcomeCard, {
  type LineCardModel,
  type MoneylineCardModel,
  type SimpleCardModel,
} from './PredictGameOutcomeCard';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import type { PredictSportOutcomeButton } from '../PredictSportOutcomeCard';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';

jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
}));

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
  const { View, Text } = jest.requireActual('react-native');
  const MockCard = (props: MockCardProps) => {
    mockCapturedCards.push({
      title: props.title,
      subtitle: props.subtitle,
      buttons: props.buttons.map((button) => ({
        label: button.label,
        price: button.price,
        variant: button.variant,
        teamColor: button.teamColor,
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
        {props.lines?.map((line, lineIdx) => (
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

const mockUseLiveMarketPrices = jest.mocked(useLiveMarketPrices);
const mockParentGetPrice = jest.fn();
const mockLineGetPrice = jest.fn();
const mockOnBuyPress = jest.fn();

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

const renderCard = (
  cardModel: SimpleCardModel | LineCardModel | MoneylineCardModel,
  game: PredictMarketGame | undefined = mockGame,
) =>
  render(
    <PredictGameOutcomeCard
      cardModel={cardModel}
      onBuyPress={mockOnBuyPress}
      game={game}
      getPrice={mockParentGetPrice}
    />,
  );

describe('PredictGameOutcomeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturedCards = [];
    mockParentGetPrice.mockReturnValue(undefined);
    mockLineGetPrice.mockReturnValue(undefined);
    mockUseLiveMarketPrices.mockImplementation(() => ({
      getPrice: mockLineGetPrice,
      prices: new Map(),
      isConnected: true,
      lastUpdateTime: null,
    }));
  });

  describe('simple cards', () => {
    it('renders the provided title and subtitle', () => {
      const cardModel: SimpleCardModel = {
        kind: 'simple',
        key: 'es-1',
        title: 'Mexico 1 - 0 South Africa',
        testID: 'exact_score-soccer_exact_score-0',
        outcome: createOutcome({
          id: 'es-1',
          sportsMarketType: 'soccer_exact_score',
          groupItemTitle: 'Mexico 1 - 0 South Africa',
          volume: 2500000,
        }),
        sportsMarketType: 'soccer_exact_score',
        pricing: {
          kind: 'shared',
          tokenIds: ['token-a', 'token-b'],
        },
      };

      renderCard(cardModel);

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].title).toBe('Mexico 1 - 0 South Africa');
      expect(mockCapturedCards[0].subtitle).toBe('$2.5M Vol');
      expect(mockCapturedCards[0].testID).toBe(
        'exact_score-soccer_exact_score-0',
      );
    });

    it('uses parent live prices and calls onBuyPress', () => {
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
      const cardModel: SimpleCardModel = {
        kind: 'simple',
        key: outcome.id,
        title: 'Draw',
        testID: 'exact_score-soccer_exact_score-0',
        outcome,
        sportsMarketType: 'soccer_exact_score',
        pricing: {
          kind: 'shared',
          tokenIds: ['tok-press', 'tok-b'],
        },
      };

      mockParentGetPrice.mockImplementation((tokenId: string) =>
        tokenId === 'tok-press'
          ? { tokenId, price: 0, bestBid: 0, bestAsk: 0.76 }
          : undefined,
      );

      const { getByTestId } = renderCard(cardModel);

      expect(mockCapturedCards[0].buttons[0].price).toBe(76);
      fireEvent(
        getByTestId('exact_score-soccer_exact_score-0-btn-0'),
        'touchEnd',
      );
      expect(mockOnBuyPress).toHaveBeenCalledWith(outcome, token);
    });
  });

  describe('line cards', () => {
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

    const lineCardModel: LineCardModel = {
      kind: 'line',
      key: 'total_corners',
      title: 'Corners',
      testID: 'corners-total_corners',
      outcomes: lineOutcomes,
      sportsMarketType: 'total_corners',
      pricing: {
        kind: 'selected-line',
      },
    };

    it('sorts lines ascending and defaults to the highest-volume line', () => {
      renderCard(lineCardModel);

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].lines).toEqual([8.5, 9.5]);
      expect(mockCapturedCards[0].selectedLine).toBe(9.5);
      expect(mockCapturedCards[0].title).toBe('Corners');
    });

    it('uses selected-line subscriptions and updates when the line changes', () => {
      mockUseLiveMarketPrices.mockImplementation((tokenIds: string[]) => ({
        getPrice: (tokenId: string) =>
          tokenIds.includes(tokenId)
            ? {
                tokenId,
                price: 0,
                bestBid: 0,
                bestAsk:
                  tokenId === 'o85' ? 0.53 : tokenId === 'o95' ? 0.42 : 0,
              }
            : undefined,
        prices: new Map(),
        isConnected: true,
        lastUpdateTime: null,
      }));

      const { getByTestId } = renderCard(lineCardModel);

      expect(
        mockUseLiveMarketPrices.mock.calls.map(([tokenIds]) => tokenIds),
      ).toEqual(expect.arrayContaining([['o95', 'u95']]));
      expect(mockCapturedCards[0].buttons[0].price).toBe(42);

      mockCapturedCards = [];
      mockUseLiveMarketPrices.mockClear();
      fireEvent(getByTestId('corners-total_corners-line-0-8.5'), 'touchEnd');

      expect(
        mockUseLiveMarketPrices.mock.calls.map(([tokenIds]) => tokenIds),
      ).toEqual(expect.arrayContaining([['o85', 'u85']]));
      expect(mockCapturedCards[0].buttons[0].price).toBe(53);
    });

    it('renders non-moneyline lines with draw variants and no team colors', () => {
      renderCard(lineCardModel);

      expect(mockCapturedCards[0].buttons[0].variant).toBe('draw');
      expect(mockCapturedCards[0].buttons[0].teamColor).toBeUndefined();
    });
  });

  describe('moneyline cards', () => {
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

    const moneylineCardModel: MoneylineCardModel = {
      kind: 'moneyline',
      key: 'moneyline',
      title: 'Moneyline',
      testID: 'game_lines-moneyline',
      outcomes: moneylineOutcomes,
      pricing: {
        kind: 'shared',
        tokenIds: ['t-hom', 't-draw', 't-awy'],
      },
    };

    it('renders an inline card with the summed volume subtitle', () => {
      renderCard(moneylineCardModel);

      expect(mockCapturedCards).toHaveLength(1);
      expect(mockCapturedCards[0].buttonLayout).toBe('inlineNoSeparator');
      expect(mockCapturedCards[0].subtitle).toBe('$10k Vol');
      expect(mockCapturedCards[0].title).toBe('Moneyline');
    });

    it('sorts outcomes by threshold and assigns moneyline variants and team colors', () => {
      renderCard(moneylineCardModel);

      expect(
        mockCapturedCards[0].buttons.map((button) => button.label),
      ).toEqual(['TA', 'Draw', 'TB']);
      expect(
        mockCapturedCards[0].buttons.map((button) => button.variant),
      ).toEqual(['yes', 'draw', 'no']);
      expect(mockCapturedCards[0].buttons[0].teamColor).toBe(
        TEST_HEX_COLORS.PURE_RED,
      );
      expect(mockCapturedCards[0].buttons[2].teamColor).toBe(
        TEST_HEX_COLORS.PURE_BLUE,
      );
    });

    it('uses parent live best ask prices and calls onBuyPress', () => {
      mockParentGetPrice.mockImplementation((tokenId: string) => ({
        tokenId,
        price: 0,
        bestBid: 0,
        bestAsk: tokenId === 't-hom' ? 0.76 : 0,
      }));

      const { getByTestId } = renderCard(moneylineCardModel);

      expect(mockCapturedCards[0].buttons[0].price).toBe(76);
      fireEvent(getByTestId('game_lines-moneyline-btn-1'), 'touchEnd');
      expect(mockOnBuyPress).toHaveBeenCalledWith(
        moneylineOutcomes[1],
        moneylineOutcomes[1].tokens[0],
      );
    });

    it('keeps a neutral "Neither" outcome in the middle', () => {
      const cardModel: MoneylineCardModel = {
        kind: 'moneyline',
        key: 'soccer_first_to_score',
        title: 'First To Score',
        testID: 'game_lines-soccer_first_to_score',
        outcomes: [
          createOutcome({
            id: 'fts-mex',
            sportsMarketType: 'soccer_first_to_score',
            groupItemTitle: 'Mexico',
            groupItemThreshold: 0,
            tokens: [createToken({ id: 'm', shortTitle: 'MEX', price: 0.73 })],
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
            tokens: [createToken({ id: 'r', shortTitle: 'RSA', price: 0.24 })],
          }),
        ],
        pricing: {
          kind: 'shared',
          tokenIds: ['m', 'n', 'r'],
        },
      };

      renderCard(cardModel);

      expect(
        mockCapturedCards[0].buttons.map((button) => button.label),
      ).toEqual(['MEX', 'Neither', 'RSA']);
      expect(
        mockCapturedCards[0].buttons.map((button) => button.variant),
      ).toEqual(['yes', 'draw', 'no']);
    });
  });
});
