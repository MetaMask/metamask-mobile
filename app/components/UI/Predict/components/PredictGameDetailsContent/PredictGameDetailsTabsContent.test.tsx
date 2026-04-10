import React from 'react';
import { render } from '@testing-library/react-native';
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
        />,
      );

      const picks = getByTestId(
        PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK,
      );

      expect(picks).toBeOnTheScreen();
      expect(picks.props.accessibilityHint).toBe('marketId:test-market-id');
    });

    it('does not render outcomes placeholder when positions exist', () => {
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
        />,
      );

      expect(
        queryByTestId(
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_PLACEHOLDER,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('enabled, no positions (no tab bar)', () => {
    it('renders outcomes placeholder directly', () => {
      const market = createMockMarket();

      const { getByTestId, getByText } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={0}
          tabs={[]}
          enabled
          showTabBar={false}
          activePositions={[]}
          claimablePositions={[]}
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_PLACEHOLDER),
      ).toBeOnTheScreen();
      expect(getByText('Outcomes coming soon')).toBeOnTheScreen();
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
        />,
      );

      expect(
        queryByText('predict.market_details.your_picks'),
      ).not.toBeOnTheScreen();
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

    it('renders outcomes placeholder when active tab key is outcomes', () => {
      const market = createMockMarket();

      const { getByTestId, getByText } = render(
        <PredictGameDetailsTabsContent
          market={market}
          activeTab={1}
          tabs={positionsTabs}
          enabled
          showTabBar
          activePositions={mockActivePositions}
          claimablePositions={[]}
        />,
      );

      expect(
        getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_PLACEHOLDER),
      ).toBeOnTheScreen();
      expect(getByText('Outcomes coming soon')).toBeOnTheScreen();
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
        />,
      );

      expect(
        queryByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_PLACEHOLDER,
        ),
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
        />,
      );

      expect(
        queryByText('predict.market_details.your_picks'),
      ).not.toBeOnTheScreen();
    });
  });
});
