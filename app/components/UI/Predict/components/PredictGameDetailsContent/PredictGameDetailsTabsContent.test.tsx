import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGameDetailsTabsContent from './PredictGameDetailsTabsContent';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPosition,
} from '../../types';
import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (action: () => void) => action(),
    isEligible: true,
  }),
}));

const mockNavigateToBuyPreview = jest.fn();
jest.mock('../../hooks/usePredictNavigation', () => ({
  usePredictNavigation: () => ({
    navigateToBuyPreview: mockNavigateToBuyPreview,
  }),
}));

jest.mock('./PredictGameOutcomesTab', () => {
  const { View, Pressable, Text } = jest.requireActual('react-native');
  const { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS: IDS } = jest.requireActual(
    './PredictGameDetailsContent.testIds',
  );
  return {
    __esModule: true,
    default: (
      props: Record<string, ((...args: unknown[]) => void) | undefined>,
    ) => {
      const mockBuyPress = props.onBuyPress;
      return (
        <View testID={IDS.OUTCOMES_CONTENT}>
          <Pressable
            testID="mock-buy-button"
            onPress={() =>
              mockBuyPress?.(
                { id: 'outcome-1', title: 'Test' },
                { id: 'token-1', title: 'Yes' },
              )
            }
          >
            <Text>Buy</Text>
          </Pressable>
        </View>
      );
    },
  };
});

jest.mock('../PredictPicks/PredictPicks', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictPicks({
    testID,
    market,
  }: {
    testID?: string;
    market?: { id: string };
  }) {
    return (
      <View
        testID={testID}
        accessibilityHint={`marketId:${market?.id ?? 'undefined'}`}
      />
    );
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockBaseGame = {
  id: 'game-123',
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

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id: 'test-market-id',
    title: 'Test Game Market',
    description: 'Test description',
    image: 'https://example.com/image.png',
    providerId: POLYMARKET_PROVIDER_ID,
    status: PredictMarketStatus.OPEN,
    category: 'sports',
    tags: ['NFL'],
    outcomes: [
      {
        id: 'outcome-1',
        marketId: 'test-market-id',
        title: 'Team A',
        groupItemTitle: 'Team A',
        status: 'open',
        volume: 1000,
        tokens: [
          { id: 'token-1', title: 'Team A', price: 0.65 },
          { id: 'token-2', title: 'Team B', price: 0.35 },
        ],
      },
    ],
    endDate: '2024-12-31T23:59:59Z',
    game: mockBaseGame,
    ...overrides,
  }) as PredictMarket;

const mockActivePositions = [{ id: 'pos-1' }] as PredictPosition[];

const emptyGroupMap = new Map();

const positionsTabs: { label: string; key: PredictMarketDetailsTabKey }[] = [
  { label: 'Positions', key: 'positions' },
  { label: 'Outcomes', key: 'outcomes' },
];

describe('PredictGameDetailsTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('disabled (flag off)', () => {
    it('returns null when no positions exist', () => {
      const market = createMockMarket();

      const { toJSON } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled={false}
          showTabBar={false}
          activePositions={[]}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders "Your picks" title when positions exist', () => {
      const market = createMockMarket();

      const { getByText } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled={false}
          showTabBar={false}
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(getByText('predict.market_details.your_picks')).toBeOnTheScreen();
    });

    it('renders PredictPicks with market when positions exist', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled={false}
          showTabBar={false}
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      const picks = getByTestId(
        PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK,
      );

      expect(picks).toBeOnTheScreen();
      expect(picks.props.accessibilityHint).toBe('marketId:test-market-id');
    });

    it('does not render outcomes content when positions exist', () => {
      const market = createMockMarket();

      const { queryByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled={false}
          showTabBar={false}
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        queryByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).not.toBeOnTheScreen();
    });
  });

  describe('enabled, no positions (no tab bar)', () => {
    it('renders outcome group chips directly', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled
          showTabBar={false}
          activePositions={[]}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
    });

    it('does not render PredictPicks', () => {
      const market = createMockMarket();

      const { queryByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled
          showTabBar={false}
          activePositions={[]}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        queryByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK),
      ).not.toBeOnTheScreen();
    });

    it('does not render "Your picks" title', () => {
      const market = createMockMarket();

      const { queryByText } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled
          showTabBar={false}
          activePositions={[]}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        queryByText('predict.market_details.your_picks'),
      ).not.toBeOnTheScreen();
    });

    it('calls navigateToBuyPreview when buy button is pressed', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled
          showTabBar={false}
          activePositions={[]}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      fireEvent.press(getByTestId('mock-buy-button'));

      expect(mockNavigateToBuyPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          market,
          outcome: { id: 'outcome-1', title: 'Test' },
          outcomeToken: { id: 'token-1', title: 'Yes' },
        }),
      );
    });
  });

  describe('enabled, with positions (tab bar)', () => {
    it('renders PredictPicks when active tab key is positions', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={positionsTabs}
          enabled
          showTabBar
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      const tabContent = getByTestId(
        PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT,
      );
      const picks = getByTestId(
        PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK,
      );

      expect(tabContent).toBeOnTheScreen();
      expect(picks).toBeOnTheScreen();
      expect(picks.props.accessibilityHint).toBe('marketId:test-market-id');
    });

    it('renders outcome group chips when active tab key is outcomes', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={1}
          tabs={positionsTabs}
          enabled
          showTabBar
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).toBeOnTheScreen();
    });

    it('renders nothing when activeTab is out of bounds', () => {
      const market = createMockMarket();

      const { queryByTestId } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={99}
          tabs={positionsTabs}
          enabled
          showTabBar
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        queryByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
      ).not.toBeOnTheScreen();
    });

    it('does not render "Your picks" title', () => {
      const market = createMockMarket();

      const { queryByText } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={positionsTabs}
          enabled
          showTabBar
          activePositions={mockActivePositions}
          claimablePositions={[]}
          groupMap={emptyGroupMap}
          activeChipKey=""
        />,
      );

      expect(
        queryByText('predict.market_details.your_picks'),
      ).not.toBeOnTheScreen();
    });
  });
});
