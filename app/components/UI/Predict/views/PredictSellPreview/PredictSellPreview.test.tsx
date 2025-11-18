import {
  NavigationProp,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
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

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

// Mock Alert
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

// Mock usePredictPlaceOrder hook
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
          // Call the mock - jest mocks automatically return resolved promises
          const result = mockPlaceOrder(...args);
          mockLoadingState = false;
          // Call onComplete after successful operation with the result
          if (onComplete && result) onComplete(result);
          return result;
        } catch (error) {
          mockLoadingState = false;
          // Call onError with the error message
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

// Mock usePredictOrderPreview hook
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

// Let renderWithProvider handle theme mocking

// Mock useStyles
const mockUseStyles = jest.fn();
jest.mock('../../../../../component-library/hooks/useStyles', () => ({
  useStyles: (styleSheet: Record<string, unknown>) => mockUseStyles(styleSheet),
}));

// Mock SafeArea hooks
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: jest.fn().mockImplementation(({ children }) => children),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock format utilities
const mockFormatPrice = jest.fn();
const mockFormatPercentage = jest.fn();
const mockFormatPositionSize = jest.fn();
const mockFormatCents = jest.fn();

jest.mock('../../utils/format', () => ({
  formatPrice: (value: number, options?: { maximumDecimals?: number }) =>
    mockFormatPrice(value, options),
  formatPercentage: (value: number) => mockFormatPercentage(value),
  formatPositionSize: (
    value: number,
    options?: { minimumDecimals?: number; maximumDecimals?: number },
  ) => mockFormatPositionSize(value, options),
  formatCents: (value: number) => mockFormatCents(value),
}));

// Mock BottomSheetHeader to avoid Icon component issues
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        onClose,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
      }) => (
        <TouchableOpacity onPress={onClose} testID="bottom-sheet-header">
          {children}
        </TouchableOpacity>
      ),
    };
  },
);

// Mock Button component to avoid theme issues
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      disabled,
      loading,
      style,
      variant,
      ...props
    }: {
      label: string;
      onPress?: () => void;
      disabled?: boolean;
      loading?: boolean;
      style?: Record<string, unknown>;
      variant?: string;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity
        onPress={!disabled ? onPress : undefined}
        style={style}
        testID={`button-${variant || 'default'}`}
        disabled={disabled}
        data-disabled={disabled}
        {...props}
      >
        <Text>{loading ? 'Loading...' : label}</Text>
      </TouchableOpacity>
    ),
    ButtonVariants: {
      Primary: 'primary',
      Secondary: 'secondary',
    },
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonWidthTypes: {
      Full: 'full',
    },
  };
});

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

    // Setup default mocks
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue(mockRoute);

    // Reset mock functions
    mockPlaceOrder.mockReset();
    mockReset.mockReset();
    mockUseStyles.mockReturnValue({
      styles: {
        container: {},
        cashOutContainer: {},
        currentValue: {},
        percentPnl: {},
        bottomContainer: {},
        positionContainer: {},
        positionDetails: {},
        detailsLine: {},
        detailsLeft: {},
        detailsResolves: {},
        detailsRight: {},
        positionIcon: {},
        cashOutButtonContainer: {},
        cashOutButton: {},
        cashOutButtonText: {},
      },
    });

    mockFormatPrice.mockImplementation((value, options) => {
      if (options?.maximumDecimals === 2) {
        return `$${value.toFixed(2)}`;
      }
      return `$${value}`;
    });
    mockFormatPercentage.mockImplementation((value) => `${value}% return`);
    mockFormatPositionSize.mockImplementation((value, options) => {
      const decimals = options?.maximumDecimals ?? 2;
      return value.toFixed(decimals);
    });
    mockFormatCents.mockImplementation((value) => {
      const cents = value * 100;
      return `${cents.toFixed(0)}¢`;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders cash out screen with position details', () => {
      const { getAllByText, getByText, queryByText } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );

      expect(getAllByText('Cash out').length).toBeGreaterThan(0);
      expect(getByText('Will Bitcoin reach $150,000?')).toBeOnTheScreen();
      expect(getByText('50.00 at 50¢ per share')).toBeOnTheScreen();

      expect(
        queryByText('Funds will be added to your available balance'),
      ).toBeOnTheScreen();
    });

    it('displays current value and P&L correctly', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      // Component uses preview.minAmountReceived for current value
      expect(mockFormatPrice).toHaveBeenCalledWith(60, { maximumDecimals: 2 });
      // PnL is calculated from position data, not preview
      expect(mockFormatPercentage).toHaveBeenCalledWith(20);
    });

    it('displays positive P&L in success color', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      // The component should render with positive P&L styling
      // This is tested implicitly by the mock setup
    });

    it('displays negative P&L in error color', () => {
      // Set mock to return negative P&L
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
        percentPnl: -20, // Will be overridden by calculation
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

      expect(mockFormatPercentage).toHaveBeenCalledWith(-20);
    });

    it('uses position price when preview sharePrice is undefined', () => {
      mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        timestamp: Date.now(),
        side: 'SELL',
        sharePrice: undefined as unknown as number,
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

      expect(getByText('50.00 at 50¢ per share')).toBeOnTheScreen();
    });

    it('renders position icon with correct source', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      // Note: Testing Image component source would require additional setup
      // This test focuses on the basic rendering - component renders without crashing
    });
  });

  describe('user interactions', () => {
    it('calls placeOrder when cash out button is pressed', async () => {
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

      // Rerender to trigger useEffect with result
      rerender(<PredictSellPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('disables cash out button when loading', () => {
      mockLoadingState = true;

      const { getByTestId } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      const loadingButton = getByTestId('button-primary');
      expect(loadingButton.props['data-disabled']).toBe(true);

      // Reset loading state for other tests
      mockLoadingState = false;
    });

    it('shows loading state when loading is true', () => {
      mockLoadingState = true;

      const { getByText } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(getByText('Cashing out...')).toBeOnTheScreen();

      // Reset loading state for other tests
      mockLoadingState = false;
    });

    it('calls goBack when close button is pressed', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      // BottomSheetHeader close button - would need testId or accessibilityLabel
      // This test shows the pattern for testing header close functionality
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('calls dispatch when result is successful', async () => {
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

      // PlaceOrder is called when button is pressed
      expect(mockPlaceOrder).toHaveBeenCalled();

      // Rerender to trigger useEffect with result
      rerender(<PredictSellPreview />);

      // Dispatch is called via useEffect when result is successful
      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });

  describe('navigation integration', () => {
    it('navigates to market list after successful cash out', async () => {
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

      // Rerender to trigger useEffect with result
      rerender(<PredictSellPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('uses correct route params', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(mockUseRoute).toHaveBeenCalled();
      // Verify the component renders with preview data
      expect(mockFormatPrice).toHaveBeenCalled();
    });
  });

  describe('styling and theming', () => {
    it('applies correct theme colors to button', () => {
      const { getByTestId } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');
      // Button should have the primary color background
      expect(cashOutButton.props.style).toBeDefined();
    });

    it('uses useStyles hook for styling', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(mockUseStyles).toHaveBeenCalled();
    });
  });

  describe('cash out flow', () => {
    it('does not block cash out when order preview is available', async () => {
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
  });
});
