import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import PredictSportCardFooter from './PredictSportCardFooter';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPosition,
  PredictPositionStatus,
  Recurrence,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/usePredictPositions');
jest.mock('../../hooks/usePredictActionGuard');
jest.mock('../../hooks/usePredictClaim');

const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
>;
const mockUsePredictActionGuard = usePredictActionGuard as jest.MockedFunction<
  typeof usePredictActionGuard
>;
const mockUsePredictClaim = usePredictClaim as jest.MockedFunction<
  typeof usePredictClaim
>;

const mockIsFromTrending = jest.fn();
jest.mock('../../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      get isFromTrending() {
        return mockIsFromTrending();
      },
    }),
  },
}));

jest.mock('../PredictActionButtons', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    PredictActionButtons: function MockPredictActionButtons({
      market,
      outcome,
      onBetPress,
      onClaimPress,
      claimableAmount,
      testID,
    }: {
      market: { id: string };
      outcome: { id: string; tokens: { id: string; title: string }[] };
      onBetPress?: (token: { id: string; title: string }) => void;
      onClaimPress?: () => void;
      claimableAmount?: number;
      testID?: string;
    }) {
      const showClaimButton =
        claimableAmount && claimableAmount > 0 && onClaimPress;
      const showBetButtons = !showClaimButton && onBetPress && outcome?.tokens;

      return (
        <View testID={testID ?? 'mock-action-buttons'}>
          <Text testID={`${testID}-market-id`}>{market.id}</Text>
          <Text testID={`${testID}-outcome-id`}>{outcome?.id}</Text>
          {showClaimButton && (
            <TouchableOpacity testID={`${testID}-claim`} onPress={onClaimPress}>
              <Text>Claim ${claimableAmount}</Text>
            </TouchableOpacity>
          )}
          {showBetButtons && (
            <>
              <TouchableOpacity
                testID={`${testID}-bet-yes`}
                onPress={() => onBetPress(outcome.tokens[0])}
              >
                <Text>Bet Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`${testID}-bet-no`}
                onPress={() => onBetPress(outcome.tokens[1])}
              >
                <Text>Bet No</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    },
  };
});

jest.mock('../PredictPicks', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    PredictPicksForCard: function MockPredictPicksForCard({
      marketId,
      positions,
      showSeparator,
      testID,
    }: {
      marketId: string;
      positions?: { id: string }[];
      showSeparator?: boolean;
      testID?: string;
    }) {
      return (
        <View testID={testID ?? 'mock-picks-for-card'}>
          <Text testID={`${testID}-market-id`}>{marketId}</Text>
          <Text testID={`${testID}-positions-count`}>
            {positions?.length ?? 0}
          </Text>
          <Text testID={`${testID}-show-separator`}>
            {showSeparator ? 'true' : 'false'}
          </Text>
        </View>
      );
    },
  };
});

const createMockPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Test Market',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 25,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 50,
  cashPnl: 15.5,
  percentPnl: 5.25,
  initialValue: 100,
  currentValue: 115.5,
  avgPrice: 0.5,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
  ...overrides,
});

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'test-market',
  title: 'Test Market',
  description: 'Test description',
  image: 'https://example.com/image.png',
  status: PredictMarketStatus.OPEN,
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['test'],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'Will it happen?',
      description: 'Test outcome',
      image: 'https://example.com/outcome.png',
      status: 'open',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.65 },
        { id: 'token-no', title: 'No', price: 0.35 },
      ],
      volume: 1000000,
      groupItemTitle: 'Test Group',
    },
  ],
  liquidity: 500000,
  volume: 1000000,
  ...overrides,
});

interface MockPositionsConfig {
  activePositions?: PredictPosition[];
  claimablePositions?: PredictPosition[];
  isLoading?: boolean;
}

const setupPositionsMock = (config: MockPositionsConfig = {}) => {
  const {
    activePositions = [],
    claimablePositions = [],
    isLoading = false,
  } = config;

  mockUsePredictPositions.mockImplementation((options) => ({
    positions: options?.claimable ? claimablePositions : activePositions,
    isLoading,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  }));
};

describe('PredictSportCardFooter', () => {
  const mockExecuteGuardedAction = jest.fn();
  const mockClaim = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFromTrending.mockReturnValue(false);

    setupPositionsMock();

    mockUsePredictActionGuard.mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
      isEligible: true,
      hasNoBalance: false,
    });

    mockUsePredictClaim.mockReturnValue({
      claim: mockClaim,
    });

    mockExecuteGuardedAction.mockImplementation((callback) => callback());
  });

  describe('loading state', () => {
    it('renders skeleton when positions are loading', () => {
      const market = createMockMarket();
      setupPositionsMock({ isLoading: true });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByTestId('footer-skeleton')).toBeOnTheScreen();
      expect(screen.getByTestId('footer-skeleton-1')).toBeOnTheScreen();
      expect(screen.getByTestId('footer-skeleton-2')).toBeOnTheScreen();
    });

    it('does not render bet buttons when loading', () => {
      const market = createMockMarket({ status: PredictMarketStatus.OPEN });
      setupPositionsMock({ isLoading: true });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByText('Bet Yes')).toBeNull();
      expect(screen.queryByText('Bet No')).toBeNull();
    });

    it('does not render picks when loading', () => {
      const market = createMockMarket();
      const positions = [createMockPosition()];
      setupPositionsMock({ activePositions: positions, isLoading: true });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByTestId('footer-picks')).toBeNull();
    });

    it('renders with default testID when no testID provided', () => {
      const market = createMockMarket();
      setupPositionsMock({ isLoading: true });

      render(<PredictSportCardFooter market={market} />);

      expect(screen.getByTestId('footer-skeleton')).toBeOnTheScreen();
    });
  });

  describe('hook configuration', () => {
    it('calls usePredictPositions with correct marketId for active positions', () => {
      const market = createMockMarket({ id: 'specific-market-123' });

      render(<PredictSportCardFooter market={market} />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'specific-market-123',
        autoRefreshTimeout: 10000,
      });
    });

    it('calls usePredictPositions with claimable flag for claimable positions', () => {
      const market = createMockMarket({ id: 'specific-market-123' });

      render(<PredictSportCardFooter market={market} />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'specific-market-123',
        claimable: true,
      });
    });

    it('calls usePredictActionGuard with correct providerId', () => {
      const market = createMockMarket({ providerId: 'test-provider' });

      render(<PredictSportCardFooter market={market} />);

      expect(mockUsePredictActionGuard).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'test-provider',
        }),
      );
    });

    it('calls usePredictClaim with correct providerId', () => {
      const market = createMockMarket({ providerId: 'claim-provider' });

      render(<PredictSportCardFooter market={market} />);

      expect(mockUsePredictClaim).toHaveBeenCalledWith({
        providerId: 'claim-provider',
      });
    });
  });

  describe('no positions - open market', () => {
    it('renders bet buttons when market is open and no positions', () => {
      const market = createMockMarket({ status: PredictMarketStatus.OPEN });
      setupPositionsMock();

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByTestId('footer-action-buttons')).toBeOnTheScreen();
      expect(screen.getByText('Bet Yes')).toBeOnTheScreen();
      expect(screen.getByText('Bet No')).toBeOnTheScreen();
    });

    it('does not render picks when no positions', () => {
      const market = createMockMarket({ status: PredictMarketStatus.OPEN });
      setupPositionsMock();

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByTestId('footer-picks')).toBeNull();
    });
  });

  describe('open positions - open market', () => {
    it('renders positions when user has open positions', () => {
      const market = createMockMarket({ status: PredictMarketStatus.OPEN });
      const positions = [createMockPosition({ claimable: false })];
      setupPositionsMock({ activePositions: positions });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByTestId('footer-picks')).toBeOnTheScreen();
    });

    it('does not render bet buttons when user has open positions', () => {
      const market = createMockMarket({ status: PredictMarketStatus.OPEN });
      const positions = [createMockPosition({ claimable: false })];
      setupPositionsMock({ activePositions: positions });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByText('Bet Yes')).toBeNull();
      expect(screen.queryByText('Bet No')).toBeNull();
    });

    it('passes positions to PredictPicksForCard', () => {
      const market = createMockMarket();
      const positions = [
        createMockPosition({ id: 'pos-1' }),
        createMockPosition({ id: 'pos-2' }),
      ];
      setupPositionsMock({ activePositions: positions });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(
        screen.getByTestId('footer-picks-positions-count').props.children,
      ).toBe(2);
    });

    it('passes showSeparator=true to PredictPicksForCard', () => {
      const market = createMockMarket();
      const positions = [createMockPosition()];
      setupPositionsMock({ activePositions: positions });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(
        screen.getByTestId('footer-picks-show-separator').props.children,
      ).toBe('true');
    });
  });

  describe('claimable positions - resolved market', () => {
    it('renders claim button when positions are claimable', () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({ claimable: true, currentValue: 50 }),
      ];
      setupPositionsMock({
        activePositions: claimablePositions,
        claimablePositions,
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByText('Claim $50')).toBeOnTheScreen();
    });

    it('renders claimable positions with claim button when claimable', () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({ claimable: true, currentValue: 50 }),
      ];
      setupPositionsMock({
        activePositions: [],
        claimablePositions,
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByTestId('footer-picks')).toBeOnTheScreen();
      expect(screen.getByTestId('footer-action-buttons')).toBeOnTheScreen();
    });

    it('calculates total claimable amount from claimable positions only', () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const allPositions = [
        createMockPosition({ id: 'pos-1', claimable: true, currentValue: 30 }),
        createMockPosition({ id: 'pos-2', claimable: true, currentValue: 20 }),
        createMockPosition({
          id: 'pos-3',
          claimable: false,
          currentValue: 100,
        }),
      ];
      const claimablePositions = allPositions.filter((p) => p.claimable);
      setupPositionsMock({
        activePositions: allPositions,
        claimablePositions,
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByText('Claim $50')).toBeOnTheScreen();
    });

    it('does not render bet buttons when market is resolved', () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({ claimable: true, currentValue: 50 }),
      ];
      setupPositionsMock({
        activePositions: claimablePositions,
        claimablePositions,
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByText('Bet Yes')).toBeNull();
      expect(screen.queryByText('Bet No')).toBeNull();
    });
  });

  describe('closed market', () => {
    it('renders nothing when market is closed and no positions', () => {
      const market = createMockMarket({ status: PredictMarketStatus.CLOSED });
      setupPositionsMock();

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByTestId('footer-picks')).toBeNull();
      expect(screen.queryByTestId('footer-action-buttons')).toBeNull();
    });

    it('renders positions when market is closed but has non-claimable positions', () => {
      const market = createMockMarket({ status: PredictMarketStatus.CLOSED });
      const positions = [createMockPosition({ claimable: false })];
      setupPositionsMock({
        activePositions: positions,
        claimablePositions: [],
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByTestId('footer-picks')).toBeOnTheScreen();
      expect(screen.queryByText(/Claim/)).toBeNull();
    });
  });

  describe('handleBetPress', () => {
    it('navigates to buy preview when bet button is pressed', async () => {
      const market = createMockMarket();
      setupPositionsMock();

      render(<PredictSportCardFooter market={market} testID="footer" />);
      fireEvent.press(screen.getByTestId('footer-action-buttons-bet-yes'));

      await waitFor(() => {
        expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
          expect.any(Function),
          {
            checkBalance: true,
            attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
          },
        );
      });
    });

    it('calls navigate with correct params when guarded action succeeds', async () => {
      const market = createMockMarket();
      setupPositionsMock();
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(<PredictSportCardFooter market={market} testID="footer" />);
      fireEvent.press(screen.getByTestId('footer-action-buttons-bet-yes'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PREDICT.MODALS.BUY_PREVIEW,
          {
            market,
            outcome: market.outcomes[0],
            outcomeToken: market.outcomes[0].tokens[0],
            entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
          },
        );
      });
    });

    it('uses trending entry point when from trending feed', async () => {
      mockIsFromTrending.mockReturnValue(true);
      const market = createMockMarket();
      setupPositionsMock();

      render(
        <PredictSportCardFooter
          market={market}
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
          testID="footer"
        />,
      );
      fireEvent.press(screen.getByTestId('footer-action-buttons-bet-yes'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PREDICT.MODALS.BUY_PREVIEW,
          expect.objectContaining({
            entryPoint: PredictEventValues.ENTRY_POINT.TRENDING,
          }),
        );
      });
    });

    it('uses custom entry point when not from trending', async () => {
      mockIsFromTrending.mockReturnValue(false);
      const market = createMockMarket();
      setupPositionsMock();

      render(
        <PredictSportCardFooter
          market={market}
          entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS}
          testID="footer"
        />,
      );
      fireEvent.press(screen.getByTestId('footer-action-buttons-bet-yes'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PREDICT.MODALS.BUY_PREVIEW,
          expect.objectContaining({
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
          }),
        );
      });
    });

    it('navigates through PREDICT.ROOT when entry point is CAROUSEL', async () => {
      mockIsFromTrending.mockReturnValue(false);
      const market = createMockMarket();
      setupPositionsMock();
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(
        <PredictSportCardFooter
          market={market}
          entryPoint={PredictEventValues.ENTRY_POINT.CAROUSEL}
          testID="footer"
        />,
      );
      fireEvent.press(screen.getByTestId('footer-action-buttons-bet-yes'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome: market.outcomes[0],
            outcomeToken: market.outcomes[0].tokens[0],
            entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL,
          },
        });
      });
    });
  });

  describe('handleClaimPress', () => {
    it('calls claim function when claim button is pressed', async () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({ claimable: true, currentValue: 50 }),
      ];
      setupPositionsMock({
        activePositions: claimablePositions,
        claimablePositions,
      });
      mockExecuteGuardedAction.mockImplementation(async (callback) => {
        await callback();
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);
      fireEvent.press(screen.getByTestId('footer-action-buttons-claim'));

      await waitFor(() => {
        expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
          expect.any(Function),
          { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
        );
      });
    });

    it('executes claim through guarded action', async () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({ claimable: true, currentValue: 50 }),
      ];
      setupPositionsMock({
        activePositions: claimablePositions,
        claimablePositions,
      });
      mockExecuteGuardedAction.mockImplementation(async (callback) => {
        await callback();
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);
      fireEvent.press(screen.getByTestId('footer-action-buttons-claim'));

      await waitFor(() => {
        expect(mockClaim).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('renders nothing when market has no outcomes', () => {
      const market = createMockMarket({ outcomes: [] });
      setupPositionsMock();

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.queryByTestId('footer-action-buttons')).toBeNull();
    });

    it('handles positions with null currentValue', () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({
          claimable: true,
          currentValue: undefined as unknown as number,
        }),
        createMockPosition({ id: 'pos-2', claimable: true, currentValue: 30 }),
      ];
      setupPositionsMock({
        activePositions: claimablePositions,
        claimablePositions,
      });

      render(<PredictSportCardFooter market={market} testID="footer" />);

      expect(screen.getByText('Claim $30')).toBeOnTheScreen();
    });

    it('renders with default testID when not provided', () => {
      const market = createMockMarket();
      setupPositionsMock();

      render(<PredictSportCardFooter market={market} />);

      expect(screen.getByTestId('mock-action-buttons')).toBeOnTheScreen();
    });

    it('renders picks without testID when testID prop is not provided', () => {
      const market = createMockMarket({ status: PredictMarketStatus.OPEN });
      const positions = [createMockPosition({ claimable: false })];
      setupPositionsMock({ activePositions: positions });

      render(<PredictSportCardFooter market={market} />);

      expect(screen.getByTestId('mock-picks-for-card')).toBeOnTheScreen();
    });

    it('renders claim button without testID when testID prop is not provided', () => {
      const market = createMockMarket({ status: PredictMarketStatus.RESOLVED });
      const claimablePositions = [
        createMockPosition({ claimable: true, currentValue: 50 }),
      ];
      setupPositionsMock({
        activePositions: claimablePositions,
        claimablePositions,
      });

      render(<PredictSportCardFooter market={market} />);

      expect(screen.getByTestId('mock-action-buttons')).toBeOnTheScreen();
      expect(screen.getByText('Claim $50')).toBeOnTheScreen();
    });
  });
});
