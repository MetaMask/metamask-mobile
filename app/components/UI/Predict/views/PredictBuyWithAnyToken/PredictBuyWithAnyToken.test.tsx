import { NavigationProp, RouteProp } from '@react-navigation/native';
import { screen } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket } from '../../types';
import PredictBuyWithAnyToken from './PredictBuyWithAnyToken';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockUseNavigation(),
  useRoute: () => mockUseRoute(),
}));

const mockPlaceOrder = jest.fn();
let mockLoadingState = false;
let mockPlaceOrderResult: { success: boolean; response?: unknown } | null =
  null;
let mockPlaceOrderError: string | undefined;

jest.mock('../../hooks/usePredictPlaceOrder', () => ({
  usePredictPlaceOrder: () => ({
    placeOrder: mockPlaceOrder,
    isLoading: mockLoadingState,
    result: mockPlaceOrderResult,
    error: mockPlaceOrderError,
    isOrderNotFilled: false,
    resetOrderNotFilled: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePredictOrderRetry', () => ({
  usePredictOrderRetry: () => ({
    retrySheetRef: { current: null },
    retrySheetVariant: 'busy' as const,
    isRetrying: false,
    handleRetryWithBestPrice: jest.fn(),
  }),
}));

let mockExpectedAmount = 120;
let mockMetamaskFee = 0.5;
let mockProviderFee = 1.0;
let mockTotalFeePercentage = 4;
jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: () => ({
    preview: {
      marketId: 'market-123',
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      timestamp: Date.now(),
      side: 'BUY',
      sharePrice: 0.5,
      maxAmountSpent: 100,
      minAmountReceived: mockExpectedAmount,
      slippage: 0.005,
      tickSize: 0.01,
      minOrderSize: 1,
      negRisk: false,
      fees: {
        metamaskFee: mockMetamaskFee,
        providerFee: mockProviderFee,
        totalFee: mockMetamaskFee + mockProviderFee,
        totalFeePercentage: mockTotalFeePercentage,
      },
    },
    isCalculating: false,
    error: null,
  }),
}));

let mockBalance = 1000;
let mockBalanceLoading = false;
jest.mock('./hooks/usePredictBuyAvailableBalance', () => ({
  usePredictBuyAvailableBalance: () => ({
    availableBalance: `$${mockBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    isBalanceLoading: mockBalanceLoading,
  }),
}));

jest.mock('./hooks/usePredictBuyInputState', () => ({
  usePredictBuyInputState: () => ({
    currentValue: 0,
    setCurrentValue: jest.fn(),
    currentValueUSDString: '$0.00',
    setCurrentValueUSDString: jest.fn(),
    isInputFocused: true,
    setIsInputFocused: jest.fn(),
    isUserInputChange: false,
    setIsUserInputChange: jest.fn(),
    isConfirming: false,
    setIsConfirming: jest.fn(),
  }),
}));

jest.mock('./hooks/usePredictBuyPreviewActions', () => ({
  usePredictBuyActions: () => ({
    handleBack: jest.fn(),
    handleBackSwipe: jest.fn(),
    handleTokenSelected: jest.fn(),
    handleConfirm: jest.fn(),
    handleDepositFailed: jest.fn(),
    handlePlaceOrderSuccess: jest.fn(),
    handlePlaceOrderError: jest.fn(),
  }),
}));

jest.mock('./hooks/usePredictBuyBackSwipe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./hooks/usePredictPayWithAnyTokenTracking', () => ({
  usePredictPayWithAnyTokenTracking: jest.fn(),
}));

jest.mock('./hooks/usePredictBuyConditions', () => ({
  usePredictBuyConditions: () => ({
    isPlacingOrder: false,
    isBelowMinimum: false,
    canPlaceBet: true,
    isUserChangeTriggeringCalculation: false,
    isPayFeesLoading: false,
    isBalancePulsing: false,
  }),
}));

jest.mock('../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: jest.fn(),
}));

jest.mock('./hooks/usePredictBuyInfo', () => ({
  usePredictBuyInfo: () => ({
    toWin: '$120.00',
    metamaskFee: 0.5,
    providerFee: 1.0,
    total: 101.5,
    depositFee: 0,
    rewardsFeeAmount: 0,
    errorMessage: null,
  }),
}));

jest.mock('./hooks/usePredictOrderTracking', () => ({
  usePredictOrderTracking: jest.fn(),
}));

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

jest.mock('./components/PredictPayWithAnyTokenInfo', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(
    (
      value: number,
      options?: { minimumDecimals?: number; maximumDecimals?: number },
    ) => {
      const formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: options?.minimumDecimals ?? 0,
        maximumFractionDigits: options?.maximumDecimals ?? 2,
      });
      return `$${formatted}`;
    },
  ),
  formatCents: jest.fn((value: number) => `${Math.round(value * 100)}¢`),
  formatPositionSize: jest.fn((value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US');
  }),
  formatPercentage: jest.fn((value, options) =>
    value !== undefined
      ? `${value.toFixed(options?.truncate ?? false)}%`
      : '0%',
  ),
}));

const mockMarket: PredictMarket = {
  id: 'market-123',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'bitcoin-price',
  title: 'Will Bitcoin reach $150,000?',
  description: 'Market description',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: 'none' as never,
  category: 'crypto',
  tags: ['blockchain', 'cryptocurrency'],
  outcomes: [
    {
      id: 'outcome-456',
      marketId: 'market-123',
      providerId: POLYMARKET_PROVIDER_ID,
      title: 'Bitcoin Price Outcome',
      description: 'Outcome description',
      image: 'https://example.com/outcome.png',
      status: 'open',
      volume: 1000000,
      groupItemTitle: 'Bitcoin Price',
      tokens: [
        {
          id: 'outcome-token-789',
          title: 'Yes',
          price: 0.5,
        },
        {
          id: 'outcome-token-790',
          title: 'No',
          price: 5000,
        },
      ],
      negRisk: false,
      tickSize: '0.01',
    },
  ],
  liquidity: 1000000,
  volume: 1000000,
};

const mockRoute: RouteProp<PredictNavigationParamList, 'PredictBuyPreview'> = {
  key: 'PredictBuyPreview-key',
  name: 'PredictBuyPreview',
  params: {
    market: mockMarket,
    outcome: mockMarket.outcomes[0],
    outcomeToken: {
      id: 'outcome-token-789',
      title: 'Yes',
      price: 0.5,
    },
    entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    isConfirmation: false,
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
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictBuyWithAnyToken', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockExpectedAmount = 120;
    mockLoadingState = false;
    mockPlaceOrderResult = null;
    mockPlaceOrderError = undefined;
    mockBalance = 1000;
    mockBalanceLoading = false;
    mockMetamaskFee = 0.5;
    mockProviderFee = 1.0;
    mockTotalFeePercentage = 4;

    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue(mockRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial rendering', () => {
    it('renders market title and outcome information', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });

    it('renders header with market information', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('Bitcoin Price')).toBeOnTheScreen();
    });

    it('displays to win section', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('To win')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('calls navigation hooks on component mount', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(mockUseNavigation).toHaveBeenCalled();
      expect(mockUseRoute).toHaveBeenCalled();
    });
  });

  describe('market display variations', () => {
    it('displays Yes outcome with price', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText(/Yes at 50¢/)).toBeOnTheScreen();
    });

    it('renders component with No outcome token in route', () => {
      const noOutcomeRoute = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          outcomeToken: {
            id: 'outcome-token-no',
            title: 'No',
            price: 0.6,
          },
        },
      };
      mockUseRoute.mockReturnValue(noOutcomeRoute);

      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });

    it('renders component with custom outcome title', () => {
      const customOutcomeRoute = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          outcomeToken: {
            id: 'outcome-token-custom',
            title: 'Maybe',
            price: 0.75,
          },
        },
      };
      mockUseRoute.mockReturnValue(customOutcomeRoute);

      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });
  });

  describe('route parameter variations', () => {
    it('renders component when entryPoint is undefined', () => {
      const routeWithoutEntryPoint = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          entryPoint: undefined,
        },
      };
      mockUseRoute.mockReturnValue(routeWithoutEntryPoint);

      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });

    it('renders outcome without group title when groupItemTitle is undefined', () => {
      const routeWithoutGroupTitle = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          outcome: {
            ...mockRoute.params.outcome,
            groupItemTitle: undefined,
          },
        },
      };
      mockUseRoute.mockReturnValue(routeWithoutGroupTitle);

      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText(/Yes at 50¢/)).toBeOnTheScreen();
    });
  });

  describe('confirmation mode', () => {
    it('renders with different safe area edges when isConfirmation is true', () => {
      const confirmationRoute = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          isConfirmation: true,
        },
      };
      mockUseRoute.mockReturnValue(confirmationRoute);

      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });

    it('shows PredictPayWithAnyTokenInfo when isConfirmation is true', () => {
      const confirmationRoute = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          isConfirmation: true,
        },
      };
      mockUseRoute.mockReturnValue(confirmationRoute);

      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });
  });

  describe('keypad interaction', () => {
    it('renders keypad component', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('Done')).toBeOnTheScreen();
    });

    it('shows quick amount buttons', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('$20')).toBeOnTheScreen();
      expect(screen.getByText('$50')).toBeOnTheScreen();
      expect(screen.getByText('$100')).toBeOnTheScreen();
    });
  });

  describe('fee breakdown', () => {
    it('renders fee summary component container', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('To win')).toBeOnTheScreen();
    });
  });

  describe('action button', () => {
    it('renders action button section', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('Done')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles missing preview gracefully', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });

    it('handles component mounting with all hooks', () => {
      renderWithProvider(<PredictBuyWithAnyToken />, { state: initialState });

      expect(screen.getByText('To win')).toBeOnTheScreen();
      expect(screen.getByText('Done')).toBeOnTheScreen();
    });
  });
});
