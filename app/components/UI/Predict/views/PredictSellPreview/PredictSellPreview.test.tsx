import {
  NavigationProp,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictOutcome,
  PredictPosition,
  PredictPositionStatus,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import PredictSellPreview from './PredictSellPreview';

/**
 * Mock Strategy:
 * - Only mock external dependencies (Engine, Alert, navigation, hooks with API calls)
 * - Do NOT mock: Internal components, design system, styling hooks, format utilities
 * - Navigation and order hooks are mocked because they have external side effects
 * and we're testing the component's orchestration and user interaction logic
 */

// Mock Engine for analytics tracking
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

// Mock React Native Alert API
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockUseNavigation(),
  useRoute: () => mockUseRoute(),
}));

// Mock usePredictPlaceOrder hook - external API dependency
const mockPlaceOrder = jest.fn();
const mockReset = jest.fn();
let mockLoadingState = false;
let mockPlaceOrderResult: { success: boolean; response?: unknown } | null =
  null;
let mockPlaceOrderError: string | undefined;

interface PlaceOrderResult {
  success: boolean;
  txMeta: { id: string };
}

jest.mock('../../hooks/usePredictPlaceOrder', () => ({
  usePredictPlaceOrder: (options?: {
    onError?: (error: string) => void;
    onComplete?: (result: PlaceOrderResult) => void;
  }) => {
    const { onError, onComplete } = options || {};
    return {
      placeOrder: async (...args: unknown[]) => {
        mockLoadingState = true;
        try {
          const result = mockPlaceOrder(...args);
          mockLoadingState = false;
          if (onComplete && result) onComplete(result);
          return result;
        } catch (error) {
          mockLoadingState = false;
          if (onError && error instanceof Error) {
            onError(error.message);
          }
          throw error;
        }
      },
      isLoading: mockLoadingState,
      loading: mockLoadingState,
      result: mockPlaceOrderResult,
      error: mockPlaceOrderError,
      reset: mockReset,
    };
  },
}));

// Mock usePredictOrderPreview hook - external API dependency
let mockPreview = {
  marketId: 'market-1',
  outcomeId: 'outcome-456',
  outcomeTokenId: 'outcome-token-789',
  timestamp: Date.now(),
  side: 'SELL',
  sharePrice: 0.5,
  maxAmountSpent: 100,
  minAmountReceived: 60,
  slippage: 0.005,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
};
jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: () => ({
    preview: mockPreview,
    isCalculating: false,
    error: null,
  }),
}));

const mockPosition: PredictPosition = {
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-456',
  outcome: 'Yes',
  outcomeTokenId: 'outcome-token-789',
  title: 'Will Bitcoin reach $150,000?',
  icon: 'https://example.com/bitcoin.png',
  amount: 100,
  price: 0.5,
  status: PredictPositionStatus.OPEN,
  size: 50,
  outcomeIndex: 0,
  realizedPnl: 10,
  percentPnl: 20,
  cashPnl: 5,
  claimable: true,
  initialValue: 50,
  avgPrice: 0.5,
  currentValue: 60,
  endDate: '2024-12-31',
};

const mockOutcome: PredictOutcome = {
  id: 'outcome-123',
  providerId: 'polymarket',
  marketId: 'market-123',
  title: 'Bitcoin Price Outcome',
  description: 'Outcome description',
  image: 'https://example.com/outcome.png',
  status: 'open',
  tokens: [
    {
      id: 'outcome-token-123',
      title: 'Yes',
      price: 0.5,
    },
  ],
  volume: 1000000,
  groupItemTitle: 'Bitcoin Price',
};

const mockMarket = {
  id: 'market-123',
  providerId: 'polymarket',
  slug: 'bitcoin-price',
  title: 'Will Bitcoin reach $150,000?',
  description: 'Market description',
  image: 'https://example.com/market.png',
  status: 'open' as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recurrence: 'none' as any,
  category: 'crypto' as const,
  tags: ['blockchain', 'cryptocurrency'],
  outcomes: [mockOutcome],
  liquidity: 1000000,
  volume: 1000000,
};

const mockRoute: RouteProp<PredictNavigationParamList, 'PredictSellPreview'> = {
  key: 'PredictSellPreview-key',
  name: 'PredictSellPreview',
  params: {
    market: mockMarket,
    position: mockPosition,
    outcome: mockOutcome,
  },
};

const mockNavigation: NavigationProp<PredictNavigationParamList> = {
  goBack: mockGoBack,
  dispatch: mockDispatch,
  navigate: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(),
  isFocused: jest.fn(),
  dangerouslyGetParent: jest.fn(),
  dangerouslyGetState: jest.fn(),
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictSellPreview', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock values to defaults
    mockPreview = {
      marketId: 'market-1',
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      timestamp: Date.now(),
      side: 'SELL',
      sharePrice: 0.5,
      maxAmountSpent: 100,
      minAmountReceived: 60,
      slippage: 0.005,
      tickSize: 0.01,
      minOrderSize: 1,
      negRisk: false,
    };
    mockLoadingState = false;
    mockPlaceOrderResult = null;
    mockPlaceOrderError = undefined;

    // Setup default navigation mocks
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue(mockRoute);

    // Reset mock functions
    mockPlaceOrder.mockReset();
    mockReset.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('shows cash out heading with market title and share details', () => {
      const { getAllByText, getByText, queryByText } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );

      expect(getAllByText('Cash out').length).toBeGreaterThan(0);
      expect(getByText('Will Bitcoin reach $150,000?')).toBeOnTheScreen();
      expect(getByText('$50 on Bitcoin Price • Yes at 50¢')).toBeOnTheScreen();
      expect(
        queryByText('Funds will be added to your available balance'),
      ).toBeOnTheScreen();
    });

    it('shows current value from preview minAmountReceived', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('$60')).toBeOnTheScreen();
    });

    it('shows P&L percentage calculated from position data', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('+$10 (20%)')).toBeOnTheScreen();
    });

    it('shows negative P&L when minAmountReceived is less than initial value', () => {
      mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        timestamp: Date.now(),
        side: 'SELL',
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 40,
        slippage: 0.005,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };
      const negativePnLPosition = {
        ...mockPosition,
        percentPnl: -20,
      };
      mockUseRoute.mockReturnValue({
        ...mockRoute,
        params: {
          position: negativePnLPosition,
        },
      });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('-$10 (-20%)')).toBeOnTheScreen();
    });

    it('shows zero cents when preview sharePrice is zero', () => {
      mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        timestamp: Date.now(),
        side: 'SELL',
        sharePrice: 0,
        maxAmountSpent: 100,
        minAmountReceived: 60,
        slippage: 0.005,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };

      const { getByText } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(getByText('Selling 50 shares at 0¢')).toBeOnTheScreen();
    });
  });

  describe('user interactions', () => {
    it('invokes placeOrder with correct parameters when cash out button pressed', async () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      const { getByTestId, rerender } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );
      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');

      await fireEvent.press(cashOutButton);

      expect(mockPlaceOrder).toHaveBeenCalledWith({
        providerId: 'polymarket',
        analyticsProperties: expect.objectContaining({
          marketId: 'market-123',
          marketTitle: 'Will Bitcoin reach $150,000?',
          marketCategory: 'crypto',
          marketTags: expect.any(Array),
          entryPoint: 'predict_market_details',
          transactionType: 'mm_predict_sell',
          liquidity: 1000000,
          volume: 1000000,
          sharePrice: 0.5,
        }),
        preview: expect.objectContaining({
          marketId: 'market-1',
          outcomeId: 'outcome-456',
          outcomeTokenId: 'outcome-token-789',
          side: 'SELL',
          minAmountReceived: 60,
        }),
      });
      rerender(<PredictSellPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('shows loading text when order executes', () => {
      mockLoadingState = true;
      const { getByText } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(getByText('Cashing out...')).toBeOnTheScreen();
      mockLoadingState = false;
    });
  });

  describe('navigation after successful order', () => {
    it('dispatches navigation pop action when placeOrder succeeds', async () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      const { getByTestId, rerender } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );
      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');

      await fireEvent.press(cashOutButton);

      expect(mockPlaceOrder).toHaveBeenCalled();
      rerender(<PredictSellPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('reads market and position data from route params', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(mockUseRoute).toHaveBeenCalled();
      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });
  });
});
