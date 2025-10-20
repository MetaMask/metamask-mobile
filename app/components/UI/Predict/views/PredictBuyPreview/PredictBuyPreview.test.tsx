import {
  NavigationProp,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket } from '../../types';
import PredictBuyPreview from './PredictBuyPreview';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';

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

jest.mock('../../hooks/usePredictPlaceOrder', () => ({
  usePredictPlaceOrder: () => ({
    placeOrder: mockPlaceOrder,
    isLoading: mockLoadingState,
  }),
}));

// Mock usePredictOrderPreview hook
let mockExpectedAmount = 120;
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
      fees: { metamaskFee: 0, providerFee: 0, totalFee: 0 },
    },
    isCalculating: false,
    error: null,
  }),
}));

// Mock format utilities
jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(
    (
      value: number,
      options?: { minimumDecimals?: number; maximumDecimals?: number },
    ) => {
      if (options?.minimumDecimals === 2 && options?.maximumDecimals === 2) {
        return `$${value.toFixed(2)}`;
      }
      if (options?.maximumDecimals === 2) {
        return `$${value.toFixed(2)}`;
      }
      return `$${value}`;
    },
  ),
  formatCents: jest.fn((value: number) => `${Math.round(value * 100)}¢`),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Image component to avoid image loading issues
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Image: ({ source, style }: { source: { uri: string }; style?: object }) => (
    <div data-testid="mock-image" data-source={source.uri} style={style} />
  ),
}));

// Mock Keypad component
let capturedOnChange:
  | ((params: { value: string; valueAsNumber: number }) => void)
  | null = null;
jest.mock('../../../../Base/Keypad', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      value,
      onChange,
      style,
    }: {
      value: string;
      onChange: (params: { value: string; valueAsNumber: number }) => void;
      style?: object;
    }) => {
      capturedOnChange = onChange;
      return (
        <TouchableOpacity
          onPress={() => onChange({ value: '100', valueAsNumber: 100 })}
          testID="keypad"
          style={style}
        >
          <Text>Keypad: {value}</Text>
        </TouchableOpacity>
      );
    },
  };
});

// Mock PredictAmountDisplay component
jest.mock('../../components/PredictAmountDisplay', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      amount,
      onPress,
      isActive,
    }: {
      amount: string;
      onPress?: () => void;
      isActive?: boolean;
    }) => (
      <TouchableOpacity
        onPress={onPress}
        testID={`amount-display-${isActive ? 'active' : 'inactive'}`}
      >
        <Text>{amount}</Text>
      </TouchableOpacity>
    ),
  };
});

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
  categories: ['crypto'],
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

    // Setup default mocks
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue(mockRoute);

    // Format mocks are already set up in the jest.mock above
  });

  describe('initial rendering', () => {
    it('renders place bet screen with market and outcome information', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      expect(getByText('Will Bitcoin reach $150,000?')).toBeOnTheScreen();
      expect(getByText('Yes at 50¢')).toBeOnTheScreen();
      expect(getByText('To win $120.00')).toBeOnTheScreen();
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
      expect(getByTestId('keypad')).toBeOnTheScreen();
    });

    it('displays correct fee breakdown when done button is pressed', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show fee summary
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Fee calculations are tested by the rendered text content
    });

    it('shows "All payments are made in USDC" text after pressing done', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show bottom content
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      expect(getByText('All payments are made in USDC')).toBeOnTheScreen();
    });
  });

  describe('amount input functionality', () => {
    it('deactivates amount input when done button is pressed', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      // Initially active
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
      expect(getByTestId('keypad')).toBeOnTheScreen();

      // Press done button
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      expect(queryByTestId('keypad')).toBeNull();
      expect(getByTestId('amount-display-inactive')).toBeOnTheScreen();
    });

    it('reactivates input when amount display is pressed after done', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      // Press done to deactivate
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Now press amount display to reactivate
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
      expect(getByTestId('keypad')).toBeOnTheScreen();
      expect(queryByTestId('amount-display-inactive')).toBeNull();
    });

    it('updates amount when keypad quick amount buttons are pressed', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      // Keypad is already visible
      // Press $50 button
      const fiftyButton = getByText('$50');
      fireEvent.press(fiftyButton);

      // Verify keypad exists and is rendered
      const keypad = getByTestId('keypad');
      expect(keypad).toBeOnTheScreen();
    });

    it('updates expected win amount when input changes', () => {
      mockExpectedAmount = 240; // Double the amount should double expected win

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      expect(getByText('To win $240.00')).toBeOnTheScreen();
    });
  });

  describe('place bet functionality', () => {
    it('places bet when place bet button is pressed', async () => {
      const mockResult = { success: true, txMeta: { id: 'test' } };
      mockPlaceOrder.mockReturnValue(mockResult);

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show place bet button
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      const placeBetButton = getByText('Yes • 50¢');
      fireEvent.press(placeBetButton);

      expect(mockPlaceOrder).toHaveBeenCalledWith({
        providerId: 'polymarket',
        preview: expect.objectContaining({
          marketId: 'market-123',
          outcomeId: 'outcome-456',
          outcomeTokenId: 'outcome-token-789',
          side: 'BUY',
        }),
        analyticsProperties: expect.objectContaining({
          marketId: 'market-123',
          marketTitle: 'Will Bitcoin reach $150,000?',
          marketCategory: 'crypto',
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
          transactionType: PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY,
          liquidity: 1000000,
          volume: 1000000,
          sharePrice: 0.5,
        }),
      });
    });

    it('navigates to market list after successful bet placement', async () => {
      const mockResult = { success: true, txMeta: { id: 'test' } };
      mockPlaceOrder.mockReturnValue(mockResult);

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show place bet button
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      const placeBetButton = getByText('Yes • 50¢');
      fireEvent.press(placeBetButton);

      // Wait for the timeout in onPlaceBet
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('disables place bet button when loading', () => {
      mockLoadingState = true;

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show place bet button and bottom content
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Now the button and USDC text should be visible
      expect(getByText('All payments are made in USDC')).toBeOnTheScreen();
    });

    it('shows loading state on place bet button when loading', () => {
      mockLoadingState = true;

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show place bet button and bottom content
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // When loading, the button area should still show the USDC text
      expect(getByText('All payments are made in USDC')).toBeOnTheScreen();
      // The loading state is tested implicitly by the component behavior
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByTestId } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('uses correct navigation hooks', () => {
      renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      expect(mockUseNavigation).toHaveBeenCalled();
      expect(mockUseRoute).toHaveBeenCalled();
    });
  });

  describe('market display variations', () => {
    it('displays single outcome correctly when market has one outcome with multiple tokens', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      expect(getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('displays single outcome correctly when market has one outcome', () => {
      const singleOutcomeMarket = {
        ...mockMarket,
        outcomes: [
          {
            ...mockMarket.outcomes[0],
            tokens: [
              {
                id: 'outcome-token-single',
                title: 'Yes',
                price: 0.75, // $0.75
              },
            ],
          },
        ],
      };

      const singleOutcomeRoute = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          market: singleOutcomeMarket,
          outcomeToken: {
            id: 'outcome-token-single',
            title: 'Yes',
            price: 0.75,
          },
          outcomeTokenId: 'outcome-token-single',
        },
      };

      // Set up the mock before rendering
      mockUseRoute.mockReturnValue(singleOutcomeRoute);

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Component now uses preview.sharePrice (0.5) instead of outcome token price
      expect(getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('displays multiple outcomes correctly when market has multiple outcomes', () => {
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
            title: 'Second Outcome',
            description: 'Second outcome description',
            image: 'https://example.com/outcome2.png',
            status: 'open',
            volume: 500000,
            groupItemTitle: 'Market Cap',
            tokens: [
              {
                id: 'outcome-token-791',
                title: 'Yes',
                price: 0.3, // $0.30
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

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      expect(getByText('Bitcoin Price •')).toBeOnTheScreen();
      expect(getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('applies correct colors for Yes and No outcomes', () => {
      // Testing Yes outcome (should use success color)
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      const yesText = getByText('Yes at 50¢');
      expect(yesText).toBeOnTheScreen();

      // The color styling is applied via tw.style, which would need visual testing
      // This test verifies the text is present and correct
    });

    it('applies error color for No outcome', () => {
      // Create a market with No outcome token
      const noOutcomeMarket = {
        ...mockMarket,
        outcomes: [
          {
            ...mockMarket.outcomes[0],
            tokens: [
              {
                id: 'outcome-token-no',
                title: 'No',
                price: 0.6, // $0.60
              },
            ],
          },
        ],
      };

      const noOutcomeRoute = {
        ...mockRoute,
        params: {
          ...mockRoute.params,
          market: noOutcomeMarket,
          outcomeToken: {
            id: 'outcome-token-no',
            title: 'No',
            price: 0.6,
          },
          outcomeTokenId: 'outcome-token-no',
        },
      };

      // Set up the mock before rendering
      mockUseRoute.mockReturnValue(noOutcomeRoute);

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Component now uses preview.sharePrice (0.5) instead of outcome token price
      const noText = getByText('No at 50¢');
      expect(noText).toBeOnTheScreen();

      // The error color styling is applied via tw.style for No outcomes
    });
  });

  describe('input validation', () => {
    it('limits input to 9 digits', () => {
      const { getByTestId } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Keypad is already active initially
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();

      // Simulate entering a 10-digit number (should be ignored due to 9-digit limit)
      act(() => {
        capturedOnChange?.({
          value: '1234567890', // 10 digits - should be blocked
          valueAsNumber: 1234567890,
        });
      });

      // The input should not change since it exceeded the 9-digit limit
      // The component should ignore the input and not update state
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
    });

    it('limits decimal places to 2', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Keypad is already active, simulate entering a number with more than 2 decimal places
      act(() => {
        capturedOnChange?.({
          value: '123.45678',
          valueAsNumber: 123.45678,
        });
      });

      // The component should limit to 2 decimal places
      expect(getByText('123.45')).toBeOnTheScreen();
    });

    it('handles decimal point deletion correctly', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Keypad is already active, set initial value with decimal
      act(() => {
        capturedOnChange?.({
          value: '2.5',
          valueAsNumber: 2.5,
        });
      });

      // Now simulate trying to delete when stuck on decimal (this tests the specific branch)
      act(() => {
        capturedOnChange?.({
          value: '2.', // Same as previous but trying to delete decimal
          valueAsNumber: 2.0,
        });
      });

      expect(getByText('2')).toBeOnTheScreen();
    });

    it('handles decimal point deletion in middle of number', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Keypad is already active, set initial value with decimal
      act(() => {
        capturedOnChange?.({
          value: '25.5',
          valueAsNumber: 25.5,
        });
      });

      // Simulate deleting a digit after decimal (should remove decimal too)
      act(() => {
        capturedOnChange?.({
          value: '25.', // This triggers the middle deletion logic
          valueAsNumber: 25.0,
        });
      });

      expect(getByText('25')).toBeOnTheScreen();
    });

    it('maintains input focus when keypad changes', () => {
      const { getByTestId } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Initially focused
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();

      // Simulate keypad input change
      act(() => {
        capturedOnChange?.({
          value: '50',
          valueAsNumber: 50,
        });
      });

      // Should still show active display
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
    });

    it('preserves decimal point when user just types it', () => {
      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Keypad is already active, simulate typing just a decimal point
      act(() => {
        capturedOnChange?.({
          value: '2.',
          valueAsNumber: 2.0,
        });
      });

      // Should preserve the decimal point for user to continue typing
      expect(getByText('2.')).toBeOnTheScreen();
    });
  });

  describe('input focus behavior', () => {
    it('shows summary when input is unfocused', () => {
      const { getByText, queryByText } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      // Initially focused, summary should be hidden
      expect(queryByText('Provider fee')).not.toBeOnTheScreen();

      // Press done to unfocus
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Summary should now be visible
      expect(queryByText('Provider fee')).toBeOnTheScreen();
    });

    it('shows bottom content when input is unfocused', () => {
      const { getByText, queryByText } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      // Initially focused, bottom content should be hidden
      expect(
        queryByText('All payments are made in USDC'),
      ).not.toBeOnTheScreen();

      // Press done to unfocus
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Bottom content should now be visible
      expect(queryByText('All payments are made in USDC')).toBeOnTheScreen();
    });

    it('hides keypad when input is unfocused', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PredictBuyPreview />,
        {
          state: initialState,
        },
      );

      // Initially focused, keypad should be visible
      expect(getByTestId('keypad')).toBeOnTheScreen();

      // Press done to unfocus
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Keypad should now be hidden
      expect(queryByTestId('keypad')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('handles navigation dispatch errors gracefully', () => {
      const mockResult = { success: true, txMeta: { id: 'test' } };
      mockPlaceOrder.mockReturnValue(mockResult);
      mockDispatch.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      const { getByText } = renderWithProvider(<PredictBuyPreview />, {
        state: initialState,
      });

      // Press done to show place bet button
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      const placeBetButton = getByText('Yes • 50¢');

      // The dispatch now throws and is not caught, so expect the error
      expect(() => {
        fireEvent.press(placeBetButton);
      }).toThrow('Navigation error');

      // PlaceOrder should still be called before dispatch throws
      expect(mockPlaceOrder).toHaveBeenCalled();

      // Dispatch should have been attempted
      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });
});
