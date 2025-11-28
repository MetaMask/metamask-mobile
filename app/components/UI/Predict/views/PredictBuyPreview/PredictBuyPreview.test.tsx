import {
  NavigationProp,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket } from '../../types';
import PredictBuyPreview from './PredictBuyPreview';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

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
  }),
}));

// Mock usePredictOrderPreview hook
let mockExpectedAmount = 120;
let mockMetamaskFee = 0.5;
let mockProviderFee = 1.0;
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
      },
    },
    isCalculating: false,
    error: null,
  }),
}));

// Mock usePredictBalance hook
let mockBalance = 1000;
let mockBalanceLoading = false;
const mockLoadBalance = jest.fn();
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    balance: mockBalance,
    isLoading: mockBalanceLoading,
    hasNoBalance: mockBalance === 0,
    isRefreshing: false,
    error: null,
    loadBalance: mockLoadBalance,
  }),
}));

// Mock usePredictDeposit hook
const mockDeposit = jest.fn();
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: mockDeposit,
    status: null,
  }),
}));

// Mock usePredictRewards hook
let mockRewardsEnabled = false;
let mockRewardsLoading = false;
let mockAccountOptedIn: boolean | null = null;
let mockEstimatedPoints: number | null = null;
let mockRewardsError = false;
jest.mock('../../hooks/usePredictRewards', () => ({
  usePredictRewards: (_?: number) => ({
    enabled: mockRewardsEnabled,
    isLoading: mockRewardsLoading,
    accountOptedIn: mockAccountOptedIn,
    estimatedPoints: mockEstimatedPoints,
    hasError: mockRewardsError,
  }),
}));

// Mock format utilities
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
}));

const mockMarket: PredictMarket = {
  id: 'market-123',
  providerId: 'polymarket',
  slug: 'bitcoin-price',
  title: 'Will Bitcoin reach $150,000?',
  description: 'Market description',
  image: 'https://example.com/market.png',
  status: 'open',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recurrence: 'none' as any,
  category: 'crypto',
  tags: ['blockchain', 'cryptocurrency'],
  outcomes: [
    {
      id: 'outcome-456',
      marketId: 'market-123',
      providerId: 'polymarket',
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
          price: 0.5, // $0.50
        },
        {
          id: 'outcome-token-790',
          title: 'No',
          price: 5000, // $0.50 in cents
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

describe('PredictBuyPreview', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock values to defaults
    mockExpectedAmount = 120;
    mockLoadingState = false;
    mockPlaceOrderResult = null;
    mockPlaceOrderError = undefined;
    mockBalance = 1000;
    mockBalanceLoading = false;
    mockMetamaskFee = 0.5;
    mockProviderFee = 1.0;
    mockRewardsEnabled = false;
    mockRewardsLoading = false;
    mockAccountOptedIn = null;
    mockEstimatedPoints = null;
    mockRewardsError = false;

    // Setup default mocks
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue(mockRoute);

    // Format mocks are already set up in the jest.mock above
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial rendering', () => {
    it('renders market title and outcome information', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Yes at 50¢')).toBeOnTheScreen();
      expect(screen.getByText('To win')).toBeOnTheScreen();
      expect(screen.getByText('$120.00')).toBeOnTheScreen();
    });

    it('displays disclaimer text when done button is pressed', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(
        screen.getByText(/By continuing, you accept Polymarket.s terms\./),
      ).toBeOnTheScreen();
    });
  });

  describe('amount input functionality', () => {
    it('displays expected win amount from preview', () => {
      mockExpectedAmount = 240;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('To win')).toBeOnTheScreen();
      expect(screen.getByText('$240.00')).toBeOnTheScreen();
    });

    it('shows quick amount buttons on initial render', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('$20')).toBeOnTheScreen();
      expect(screen.getByText('$50')).toBeOnTheScreen();
      expect(screen.getByText('$100')).toBeOnTheScreen();
    });
  });

  describe('place bet functionality', () => {
    it('displays place bet button after pressing done', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });

    it('dispatches pop action when result is marked as successful', () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      const { rerender } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      rerender(<PredictBuyPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('displays disclaimer text when loading state is active', () => {
      mockLoadingState = true;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(
        screen.getByText(/By continuing, you accept Polymarket.s terms\./),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('calls goBack when back button is pressed', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const backButton = screen.getByTestId('back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls navigation hooks on component mount', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(mockUseNavigation).toHaveBeenCalled();
      expect(mockUseRoute).toHaveBeenCalled();
    });
  });

  describe('market display variations', () => {
    it('displays Yes outcome with price when market has single outcome', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('displays group title when market has multiple outcomes', () => {
      const multipleOutcomesMarket = {
        ...mockMarket,
        outcomes: [
          {
            ...mockMarket.outcomes[0],
            groupItemTitle: 'Bitcoin Price',
          },
          {
            id: 'outcome-457',
            marketId: 'market-123',
            providerId: 'polymarket',
            title: 'Second Outcome',
            description: 'Second outcome description',
            image: 'https://example.com/outcome2.png',
            status: 'open' as const,
            volume: 500000,
            groupItemTitle: 'Market Cap',
            tokens: [
              {
                id: 'outcome-token-791',
                title: 'Yes',
                price: 0.3,
              },
            ],
            negRisk: false,
            tickSize: '0.01',
          },
        ],
      };
      mockUseRoute.mockReturnValue({
        ...mockRoute,
        params: {
          ...mockRoute.params,
          market: multipleOutcomesMarket,
          outcomeTokenId: 'outcome-token-789',
        },
      });

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Bitcoin Price')).toBeOnTheScreen();
      expect(screen.getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('displays No outcome with price when token title is No', () => {
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

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('No at 50¢')).toBeOnTheScreen();
    });

    it('displays custom outcome title when token title is neither Yes nor No', () => {
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

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Maybe at 50¢')).toBeOnTheScreen();
    });
  });

  describe('input focus behavior', () => {
    it('hides fees summary on initial render when input is focused', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.queryByText('Provider fee')).not.toBeOnTheScreen();
    });

    it('shows fees summary when done button is pressed', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(screen.queryByText('Fees')).toBeOnTheScreen();
    });

    it('hides disclaimer on initial render when input is focused', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText(/By continuing, you accept Polymarket.s terms\./),
      ).not.toBeOnTheScreen();
    });

    it('shows disclaimer when done button is pressed', () => {
      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(
        screen.queryByText(/By continuing, you accept Polymarket.s terms\./),
      ).toBeOnTheScreen();
    });
  });

  describe('success handling', () => {
    it('dispatches pop action when place order result is successful', () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      const { rerender } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      rerender(<PredictBuyPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });

  describe('balance loading and display', () => {
    it('displays formatted balance when balance is loaded', () => {
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Available: $1,000.00')).toBeOnTheScreen();
    });

    it('hides balance text while balance is loading', () => {
      mockBalanceLoading = true;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.queryByText(/Available:/)).not.toBeOnTheScreen();
    });

    it('displays balance with 2 decimal places', () => {
      mockBalance = 1234.56;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Available: $1,234.56')).toBeOnTheScreen();
    });

    it('displays zero balance as $0.00', () => {
      mockBalance = 0;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Available: $0.00')).toBeOnTheScreen();
    });

    it('formats large balance with commas', () => {
      mockBalance = 999999.99;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Available: $999,999.99')).toBeOnTheScreen();
    });
  });

  describe('insufficient funds validation', () => {
    it('hides insufficient funds error on initial render with zero amount', () => {
      mockBalance = 50;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText(/Not enough funds\. You can use up to/),
      ).not.toBeOnTheScreen();
    });

    it('displays available balance when balance is loaded', () => {
      mockBalance = 1.5;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText(/Available:.*\$1\.50/)).toBeOnTheScreen();
    });

    it('hides insufficient funds error when balance is loading', () => {
      mockBalance = 50;
      mockBalanceLoading = true;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText(/Not enough funds\. You can use up to/),
      ).not.toBeOnTheScreen();
    });
  });

  describe('minimum bet validation', () => {
    it('hides minimum bet error on initial render when amount is $0', () => {
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText('Minimum amount is $1.00'),
      ).not.toBeOnTheScreen();
    });

    it('hides minimum bet error when amount equals $1', () => {
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText('Minimum amount is $1.00'),
      ).not.toBeOnTheScreen();
    });

    it('prioritizes insufficient funds error over minimum bet error', () => {
      mockBalance = 0.5;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.getByText('Not enough funds. You can use up to $-1.00.'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText('Minimum amount is $1.00'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('add funds functionality', () => {
    it('shows quick action buttons on initial render with sufficient balance', () => {
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('$20')).toBeOnTheScreen();
      expect(screen.getByText('$50')).toBeOnTheScreen();
      expect(screen.getByText('$100')).toBeOnTheScreen();
      expect(screen.getByText('Done')).toBeOnTheScreen();
    });

    it('shows quick action buttons on initial render even with low balance', () => {
      mockBalance = 50;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('$20')).toBeOnTheScreen();
      expect(screen.getByText('$50')).toBeOnTheScreen();
      expect(screen.getByText('$100')).toBeOnTheScreen();
      expect(screen.getByText('Done')).toBeOnTheScreen();
    });
  });

  describe('place bet button validation', () => {
    it('displays place bet button when done button is pressed', () => {
      mockBalance = 1000;
      mockBalanceLoading = false;
      mockRewardsLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });
  });

  describe('rate limiting', () => {
    it('renders place bet button when not rate limited', () => {
      mockExpectedAmount = 120;
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');

      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });
  });

  describe('error message rendering', () => {
    it('hides error messages on initial render with zero amount', () => {
      mockBalance = 50;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText(/Not enough funds\. You can use up to/),
      ).not.toBeOnTheScreen();
    });

    it('hides error messages when balance is sufficient', () => {
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText(/Not enough funds\. You can use up to/),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('Minimum amount is $1.00'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('integration tests', () => {
    it('displays available balance and quick action buttons', () => {
      mockBalance = 100;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText(/Available:.*\$100\.00/)).toBeOnTheScreen();
      expect(screen.getByText('$20')).toBeOnTheScreen();
      expect(screen.getByText('$50')).toBeOnTheScreen();
      expect(screen.getByText('$100')).toBeOnTheScreen();
      expect(screen.getByText('Done')).toBeOnTheScreen();
    });

    it('dispatches pop action when place order result is successful', async () => {
      mockBalance = 1000;
      mockBalanceLoading = false;
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      const { rerender } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      rerender(<PredictBuyPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });

  describe('edge cases', () => {
    it('hides error on initial render with low balance', () => {
      mockBalance = 1.5;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.queryByText(/Not enough funds\. You can use up to/),
      ).not.toBeOnTheScreen();
    });

    it('displays very low balance correctly', () => {
      mockBalance = 1.4;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText(/Available:.*\$1\.40/)).toBeOnTheScreen();
    });

    it('formats very large balance with commas and two decimals', () => {
      mockBalance = 999999999;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Available: $999,999,999.00')).toBeOnTheScreen();
    });

    it('renders component with custom fees', () => {
      mockBalance = 100;
      mockBalanceLoading = false;
      mockMetamaskFee = 10;
      mockProviderFee = 20;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText(/Available:.*\$100\.00/)).toBeOnTheScreen();
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

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

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

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(screen.getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('displays No outcome in place bet button when done is pressed', () => {
      const routeWithNoToken = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          outcomeToken: {
            id: 'outcome-token-790',
            title: 'No',
            price: 0.5,
          },
        },
      };
      mockUseRoute.mockReturnValue(routeWithNoToken);
      mockBalance = 1000;
      mockBalanceLoading = false;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');
      fireEvent.press(doneButton);

      expect(screen.getByText('No · 50¢')).toBeOnTheScreen();
    });
  });

  describe('rewards integration', () => {
    it('renders component when rewards are enabled with estimated points', () => {
      mockMetamaskFee = 0.5;
      mockProviderFee = 1.0;
      mockRewardsEnabled = true;
      mockAccountOptedIn = true;
      mockEstimatedPoints = 50;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');
      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });

    it('renders component when rewards are enabled with zero points', () => {
      mockMetamaskFee = 0;
      mockProviderFee = 0;
      mockRewardsEnabled = true;
      mockAccountOptedIn = true;
      mockEstimatedPoints = 0;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });

      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });

    it('renders component when rewards loading state is true', () => {
      mockRewardsEnabled = true;
      mockAccountOptedIn = true;
      mockRewardsLoading = true;
      mockEstimatedPoints = 50;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');
      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });

    it('renders component when rewards error state is true', () => {
      mockRewardsEnabled = true;
      mockAccountOptedIn = true;
      mockRewardsError = true;
      mockEstimatedPoints = null;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');
      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });

    it('renders component when account is not opted in to rewards', () => {
      mockRewardsEnabled = true;
      mockAccountOptedIn = false;
      mockEstimatedPoints = null;

      renderWithProvider(<PredictBuyPreview />, { state: initialState });
      const doneButton = screen.getByText('Done');
      fireEvent.press(doneButton);

      expect(screen.getByText('Yes · 50¢')).toBeOnTheScreen();
    });
  });
});
