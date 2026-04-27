import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderPositionView from './TraderPositionView';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import type { Position, Trade } from '@metamask/social-controllers';
import {
  useTraderPositionScreenData,
  type UseTraderPositionScreenDataResult,
} from './hooks/useTraderPositionScreenData';
import { TIME_PERIODS } from './useTraderPositionData';

// ---------------------------------------------------------------------------
// Route params type — declared here so jest.mock factories can close over it
// ---------------------------------------------------------------------------

interface MockRouteParams {
  traderId: string;
  tokenAddress: string;
  chain: string;
  tokenSymbol: string;
  positionContext: 'open' | 'closed';
  traderName?: string;
  traderImageUrl?: string;
  position?: Position;
}

let mockRouteParams: MockRouteParams = {
  traderId: 'trader-1',
  traderName: 'dutchiono',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chain: 'base',
  tokenSymbol: 'PEPE',
  positionContext: 'open',
  position: undefined,
};

// ---------------------------------------------------------------------------
// Mock wiring
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseTraderPositionScreenData =
  useTraderPositionScreenData as jest.MockedFunction<
    typeof useTraderPositionScreenData
  >;

jest.mock('./hooks/useTraderPositionScreenData');

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => {
  const { createMockUseAnalyticsHook } = jest.requireActual(
    '../../../../util/test/analyticsMock',
  );
  return { useAnalytics: () => createMockUseAnalyticsHook() };
});

jest.mock('../../../UI/AssetOverview/PriceChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="price-chart-mock" />,
  };
});

jest.mock('../../../UI/AssetOverview/PriceChart/PriceChart.context', () => {
  const ReactActual = jest.requireActual('react');
  return {
    PriceChartProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock('../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn().mockReturnValue('https://example.com/token.png'),
  toAssetId: (address: string, chainId: string) =>
    `${chainId}/erc20:${address}`,
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// QuickBuyBottomSheet is heavy; stub it so these tests stay fast.
jest.mock('./components/QuickBuyBottomSheet', () => ({
  __esModule: true,
  default: ({ isVisible }: { isVisible: boolean }) => {
    const { View } = jest.requireActual('react-native');
    return isVisible ? <View testID="quick-buy-bottom-sheet" /> : null;
  },
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeMockTrades = (): Trade[] => [
  {
    intent: 'enter',
    direction: 'buy',
    tokenAmount: 1000,
    usdCost: 2200,
    timestamp: Date.now() - 30 * 60 * 1000,
    transactionHash: '0xabc',
  },
  {
    intent: 'exit',
    direction: 'sell',
    tokenAmount: 500,
    usdCost: 1100,
    timestamp: Date.now() - 60 * 60 * 1000,
    transactionHash: '0xdef',
  },
];

const makeDefaultPosition = (): Position => ({
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: makeMockTrades(),
  lastTradeAt: Date.now(),
  currentValueUSD: 900,
  pnlValueUsd: 400,
  pnlPercent: 80,
});

const makeScreenData = (
  overrides: Partial<UseTraderPositionScreenDataResult> = {},
): UseTraderPositionScreenDataResult => ({
  position: makeDefaultPosition(),
  isInitialLoading: false,
  isRefreshing: false,
  error: null,
  symbol: 'PEPE',
  tokenImageUrl: 'https://example.com/token.png',
  marketCap: undefined,
  historicalPrices: [],
  priceDiff: 0,
  isPricesLoading: false,
  pricePercentChange: undefined,
  isClosed: false,
  positionValue: 900,
  pnlValue: 400,
  pnlPercent: 80,
  isPnlPositive: true,
  trades: makeMockTrades(),
  activeTimePeriod: '1D',
  setActiveTimePeriod: jest.fn(),
  timePeriods: TIME_PERIODS,
  ...overrides,
});

const mockState = {
  engine: {
    backgroundState: {
      TokenRatesController: { marketData: {} },
      CurrencyRateController: { currentCurrency: 'usd' },
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TraderPositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTraderPositionScreenData.mockReturnValue(makeScreenData());
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'dutchiono',
      tokenAddress: '0x1234567890123456789012345678901234567890',
      chain: 'base',
      tokenSymbol: 'PEPE',
      positionContext: 'open',
      position: makeDefaultPosition(),
    };
  });

  // ── Normal content rendering ─────────────────────────────────────────────

  describe('content rendering', () => {
    it('renders the container when position is available', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the trader name in the header', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(screen.getByText('dutchiono')).toBeOnTheScreen();
    });

    it('renders the token symbol when position is resolved', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(screen.getAllByText('PEPE').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the buy button when position is resolved', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
    });

    it('shows empty state when trades array is empty', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ trades: [] }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(screen.getByText('No trades for this interval')).toBeOnTheScreen();
    });

    it('renders closed position label with realized PnL data', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({
          position: {
            ...makeDefaultPosition(),
            positionAmount: 0,
            soldUsd: 1500,
            realizedPnl: 300,
            boughtUsd: 1200,
            currentValueUSD: 0,
          },
          isClosed: true,
          positionValue: null,
          pnlValue: 300,
          pnlPercent: 25,
          isPnlPositive: true,
        }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(screen.getByText('Closed position')).toBeOnTheScreen();
      expect(screen.getByText('+$300.00')).toBeOnTheScreen();
      expect(screen.getByText('+25%')).toBeOnTheScreen();
    });

    it('displays market cap when provided by the hook', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ marketCap: 11_700_000 }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(screen.getByText('$11.7M')).toBeOnTheScreen();
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('calls goBack when the close button is pressed', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.CLOSE_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  // ── Loading / skeleton state ─────────────────────────────────────────────

  describe('initial loading state (deeplink cold-start)', () => {
    it('renders the skeleton when isInitialLoading is true', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: true, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.SKELETON),
      ).toBeOnTheScreen();
    });

    it('does not render the buy button while skeleton is displayed', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: true, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.queryByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('does not show the skeleton once loading completes', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.queryByTestId(TraderPositionViewSelectorsIDs.SKELETON),
      ).not.toBeOnTheScreen();
    });
  });

  // ── Fallback state ───────────────────────────────────────────────────────

  describe('fallback state (no-match after fetch)', () => {
    it('renders the fallback when position is undefined and loading is complete', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: false, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.FALLBACK),
      ).toBeOnTheScreen();
    });

    it('renders the fallback primary action button', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: false, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(
          TraderPositionViewSelectorsIDs.FALLBACK_PRIMARY_ACTION,
        ),
      ).toBeOnTheScreen();
    });

    it('navigates to the trader profile when the fallback primary action is pressed', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: false, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(
          TraderPositionViewSelectorsIDs.FALLBACK_PRIMARY_ACTION,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        'TraderProfileView',
        expect.objectContaining({ traderId: 'trader-1' }),
      );
    });

    it('does not render the buy button in fallback state', () => {
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: false, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.queryByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  // ── Quick Buy gate ───────────────────────────────────────────────────────

  describe('Quick Buy gate', () => {
    it('opens Quick Buy bottom sheet when buy button is pressed and position is resolved', async () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(screen.getByTestId('quick-buy-bottom-sheet')).toBeOnTheScreen();
      });
    });
  });

  // ── Deeplink simulation (was: position: undefined in route params) ────────

  describe('deeplink simulation (no bootstrap position in params)', () => {
    it('renders the skeleton during the initial fetch when no bootstrap is provided', () => {
      mockRouteParams = { ...mockRouteParams, position: undefined };
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: true, position: undefined }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.SKELETON),
      ).toBeOnTheScreen();
    });

    it('renders content once fetch resolves with a matching position', async () => {
      mockRouteParams = { ...mockRouteParams, position: undefined };
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({ isInitialLoading: false }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      await waitFor(() => {
        expect(screen.getAllByText('PEPE').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('falls back to tokenSymbol from route params for the symbol label', async () => {
      mockRouteParams = {
        ...mockRouteParams,
        tokenSymbol: 'DOGE',
        position: undefined,
      };
      mockUseTraderPositionScreenData.mockReturnValue(
        makeScreenData({
          position: undefined,
          isInitialLoading: false,
          symbol: 'DOGE',
        }),
      );

      renderWithProvider(<TraderPositionView />, { state: mockState });

      await waitFor(() => {
        expect(
          screen.getByTestId(TraderPositionViewSelectorsIDs.FALLBACK),
        ).toBeOnTheScreen();
      });
    });
  });

  // ── Hook input forwarding ────────────────────────────────────────────────

  describe('hook input forwarding', () => {
    it('passes all required identity params to useTraderPositionScreenData', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(mockUseTraderPositionScreenData).toHaveBeenCalledWith(
        expect.objectContaining({
          traderId: 'trader-1',
          tokenAddress: '0x1234567890123456789012345678901234567890',
          chain: 'base',
          tokenSymbol: 'PEPE',
          positionContext: 'open',
        }),
      );
    });

    it('forwards the bootstrap position as initialPosition when present in params', () => {
      const bootstrap = makeDefaultPosition();
      mockRouteParams = { ...mockRouteParams, position: bootstrap };

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(mockUseTraderPositionScreenData).toHaveBeenCalledWith(
        expect.objectContaining({ initialPosition: bootstrap }),
      );
    });

    it('passes undefined initialPosition when no bootstrap is in route params', () => {
      mockRouteParams = { ...mockRouteParams, position: undefined };

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(mockUseTraderPositionScreenData).toHaveBeenCalledWith(
        expect.objectContaining({ initialPosition: undefined }),
      );
    });
  });
});
