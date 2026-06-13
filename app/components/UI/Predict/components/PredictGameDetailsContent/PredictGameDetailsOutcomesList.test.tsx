import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import PredictGameDetailsOutcomesList from './PredictGameDetailsOutcomesList';
import type {
  PredictMarket,
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';

jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
}));

jest.mock('../PredictSportOutcomeCard', () => {
  const { View: ActualView, Text } = jest.requireActual('react-native');
  return function MockPredictSportOutcomeCard(props: {
    title: string;
    lines?: number[];
    selectedLine?: number;
    onSelectLine?: (line: number, index: number) => void;
    testID?: string;
  }) {
    return (
      <ActualView testID={props.testID}>
        <Text>{props.title}</Text>
        {props.lines?.map((line, index) => (
          <ActualView
            key={`${index}-${line}`}
            testID={`${props.testID}-line-${index}-${line}`}
            accessibilityHint={
              line === props.selectedLine ? 'selected' : 'unselected'
            }
            onTouchEnd={() => props.onSelectLine?.(line, index)}
          />
        ))}
      </ActualView>
    );
  };
});

jest.mock('../PredictSportScoreboard', () => {
  const { View: ActualView } = jest.requireActual('react-native');
  return function MockPredictSportScoreboard({ testID }: { testID?: string }) {
    return <ActualView testID={testID} />;
  };
});

jest.mock('../PredictGameChart', () => {
  const { View: ActualView } = jest.requireActual('react-native');
  return function MockPredictGameChart({ testID }: { testID?: string }) {
    return <ActualView testID={testID} />;
  };
});

jest.mock('../PredictPicks/PredictPicks', () => {
  const { View: ActualView } = jest.requireActual('react-native');
  return function MockPredictPicks({ testID }: { testID?: string }) {
    return <ActualView testID={testID} />;
  };
});

const mockUseLiveMarketPrices = jest.mocked(useLiveMarketPrices);

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
    title: 'Outcome',
    groupItemTitle: 'Outcome',
    status: 'open',
    volume: 1000,
    sportsMarketType: 'total_corners',
    tokens: [createToken({ id: 'over' }), createToken({ id: 'under' })],
    ...overrides,
  }) as PredictOutcome;

const mockGame: PredictMarketGame = {
  id: 'game-1',
  homeTeam: {
    id: 'home',
    name: 'Home',
    abbreviation: 'HOM',
    color: TEST_HEX_COLORS.PURE_BLACK,
    alias: 'Home',
    logo: '',
  },
  awayTeam: {
    id: 'away',
    name: 'Away',
    abbreviation: 'AWY',
    color: TEST_HEX_COLORS.WHITE_FULL,
    alias: 'Away',
    logo: '',
  },
  startTime: '2024-12-31T20:00:00Z',
  status: 'scheduled',
  league: 'nfl',
  elapsed: null,
  period: null,
  score: null,
};

const mockMarket = {
  id: 'market-1',
} as PredictMarket;

const lineCardGroup: PredictOutcomeGroup = {
  key: 'game_lines',
  outcomes: [],
  subgroups: [
    {
      key: 'total_corners',
      title: 'Corners',
      outcomes: [
        createOutcome({
          id: 'line-85',
          groupItemTitle: 'Total Corners: O/U 8.5',
          line: 8.5,
          volume: 1000,
          tokens: [
            createToken({ id: 'over-85', shortTitle: 'O 8.5' }),
            createToken({ id: 'under-85', shortTitle: 'U 8.5' }),
          ],
        }),
        createOutcome({
          id: 'line-95',
          groupItemTitle: 'Total Corners: O/U 9.5',
          line: 9.5,
          volume: 5000,
          tokens: [
            createToken({ id: 'over-95', shortTitle: 'O 9.5' }),
            createToken({ id: 'under-95', shortTitle: 'U 9.5' }),
          ],
        }),
      ],
    },
  ],
};

const otherGroup: PredictOutcomeGroup = {
  key: 'goals',
  outcomes: [],
  subgroups: [
    {
      key: 'player_goals',
      title: 'Goals',
      outcomes: [
        createOutcome({
          id: 'goal-1',
          sportsMarketType: 'soccer_player_goals',
          groupItemTitle: 'Player One: 1+ goals',
        }),
      ],
    },
  ],
};

const groupMap = new Map<string, PredictOutcomeGroup>([
  [lineCardGroup.key, lineCardGroup],
  [otherGroup.key, otherGroup],
]);

describe('PredictGameDetailsOutcomesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: jest.fn(),
      prices: new Map(),
      isConnected: true,
      lastUpdateTime: null,
    });
  });

  it('renders the list header, sticky controls, and outcomes content', () => {
    const { getAllByTestId, getByTestId } = render(
      <PredictGameDetailsOutcomesList
        market={mockMarket}
        enabled
        groupMap={groupMap}
        activeChipKey="game_lines"
        onBetPress={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        showTabBar
        tabs={[{ key: 'outcomes', label: 'Outcomes' }]}
        activeTab={0}
        onTabPress={jest.fn()}
        showChips
        chips={[{ key: 'game_lines', label: 'Game Lines' }]}
        onChipSelect={jest.fn()}
        activePositions={[]}
        claimablePositions={[]}
        listHeaderComponent={<View testID="list-header" />}
      />,
    );

    expect(getByTestId('list-header')).toBeOnTheScreen();
    expect(
      getAllByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
    ).toHaveLength(2);
    expect(getByTestId('predict-chip-game_lines')).toBeOnTheScreen();
    expect(getByTestId('game_lines-total_corners')).toBeOnTheScreen();
  });

  it('renders positions content for the positions tab', () => {
    const { getByTestId } = render(
      <PredictGameDetailsOutcomesList
        market={mockMarket}
        enabled
        groupMap={groupMap}
        activeChipKey="game_lines"
        onBetPress={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        showTabBar
        tabs={[
          { key: 'outcomes', label: 'Outcomes' },
          { key: 'positions', label: 'Positions' },
        ]}
        activeTab={1}
        onTabPress={jest.fn()}
        showChips={false}
        chips={[]}
        onChipSelect={jest.fn()}
        activePositions={[]}
        claimablePositions={[]}
      />,
    );

    expect(
      getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK),
    ).toBeOnTheScreen();
  });
});
