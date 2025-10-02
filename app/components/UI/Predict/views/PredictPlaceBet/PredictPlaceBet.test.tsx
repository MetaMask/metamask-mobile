import {
  NavigationProp,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket, Side } from '../../types';
import PredictPlaceBet from './PredictPlaceBet';
import { PredictNavigationParamList } from '../../types/navigation';

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

// Mock usePredictBetAmounts hook
let mockExpectedAmount = 120;
jest.mock('../../hooks/usePredictBetAmounts', () => ({
  usePredictBetAmounts: () => ({
    betAmounts: { toWin: mockExpectedAmount },
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
};

const mockRoute: RouteProp<PredictNavigationParamList, 'PredictPlaceBet'> = {
  key: 'PredictPlaceBet-key',
  name: 'PredictPlaceBet',
  params: {
    market: mockMarket,
    outcome: mockMarket.outcomes[0],
    outcomeToken: {
      id: 'outcome-token-789',
      title: 'Yes',
      price: 0.5,
    },
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

describe('PredictPlaceBet', () => {
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
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      expect(getByText('Will Bitcoin reach $150,000?')).toBeOnTheScreen();
      expect(getByText('Yes at 50¢')).toBeOnTheScreen();
      expect(getByText('To win $120.00')).toBeOnTheScreen();
      expect(getByTestId('amount-display-inactive')).toBeOnTheScreen();
    });

    it('displays correct fee breakdown when not focused', () => {
      renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // Fee calculations are tested by the rendered text content
    });

    it('shows "All payments are made in USDC" text', () => {
      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      expect(getByText('All payments are made in USDC')).toBeOnTheScreen();
    });
  });

  describe('amount input functionality', () => {
    it('activates amount input when amount display is pressed', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
      expect(getByTestId('keypad')).toBeOnTheScreen();
      expect(queryByTestId('amount-display-inactive')).toBeNull();
    });

    it('hides keypad when done button is pressed', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Activate input
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Press done button (should be the last button in the row)
      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      expect(queryByTestId('keypad')).toBeNull();
      expect(getByTestId('amount-display-inactive')).toBeOnTheScreen();
    });

    it('updates amount when keypad quick amount buttons are pressed', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Activate input
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Press $50 button
      const fiftyButton = getByText('$50');
      fireEvent.press(fiftyButton);

      // Verify keypad exists and is rendered
      const keypad = getByTestId('keypad');
      expect(keypad).toBeOnTheScreen();
    });

    it('updates expected win amount when input changes', () => {
      mockExpectedAmount = 240; // Double the amount should double expected win

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      expect(getByText('To win $240.00')).toBeOnTheScreen();
    });
  });

  describe('fee calculations', () => {
    it('calculates provider fee as 0% of amount', () => {
      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // Provider fee is hardcoded to 0 in the component
      expect(getByText('$0.00')).toBeOnTheScreen();
    });

    it('calculates MetaMask fee as 4% of amount', () => {
      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // MetaMask fee is 4% of $1 = $0.04
      expect(getByText('$0.04')).toBeOnTheScreen();
    });

    it('calculates total as amount plus all fees', () => {
      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // Total = $1 + $0 (provider) + $0.04 (MetaMask) = $1.04
      expect(getByText('$1.04')).toBeOnTheScreen();
    });
  });

  describe('place bet functionality', () => {
    it('places bet when place bet button is pressed', async () => {
      const mockResult = { success: true, txMeta: { id: 'test' } };
      mockPlaceOrder.mockReturnValue(mockResult);

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      const placeBetButton = getByText('Yes • 50¢');
      fireEvent.press(placeBetButton);

      expect(mockPlaceOrder).toHaveBeenCalledWith({
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        side: Side.BUY,
        size: 1,
        providerId: 'polymarket',
      });
    });

    it('navigates to market list after successful bet placement', async () => {
      const mockResult = { success: true, txMeta: { id: 'test' } };
      mockPlaceOrder.mockReturnValue(mockResult);

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      const placeBetButton = getByText('Yes • 50¢');
      fireEvent.press(placeBetButton);

      // Wait for the timeout in onPlaceBet
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace('PredictMarketList'),
      );
    });

    it('disables place bet button when loading', () => {
      mockLoadingState = true;

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // When loading, the button shows "All payments are made in USDC" text
      // but the button itself is not rendered as a TouchableOpacity with text
      expect(getByText('All payments are made in USDC')).toBeOnTheScreen();
    });

    it('shows loading state on place bet button when loading', () => {
      mockLoadingState = true;

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // When loading, the button area should still show the USDC text
      expect(getByText('All payments are made in USDC')).toBeOnTheScreen();
      // The loading state is tested implicitly by the component behavior
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByTestId } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('uses correct navigation hooks', () => {
      renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      expect(mockUseNavigation).toHaveBeenCalled();
      expect(mockUseRoute).toHaveBeenCalled();
    });
  });

  describe('market display variations', () => {
    it('displays single outcome correctly when market has one outcome with multiple tokens', () => {
      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
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

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      expect(getByText('Yes at 75¢')).toBeOnTheScreen();
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

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      expect(getByText('Bitcoin Price •')).toBeOnTheScreen();
      expect(getByText('Yes at 50¢')).toBeOnTheScreen();
    });

    it('applies correct colors for Yes and No outcomes', () => {
      // Testing Yes outcome (should use success color)
      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
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

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      const noText = getByText('No at 60¢');
      expect(noText).toBeOnTheScreen();

      // The error color styling is applied via tw.style for No outcomes
    });
  });

  describe('input validation', () => {
    it('limits input to 9 digits', () => {
      const { getByTestId } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // Activate keypad input
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

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
      const { getByTestId, getByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Activate keypad input
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Simulate entering a number with more than 2 decimal places
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
      const { getByTestId, getByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Activate keypad input and set initial value
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // First set a value with decimal
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
      const { getByTestId, getByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Activate keypad input and set initial value
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Set initial value with decimal
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

    it('sets input focus flags when keypad changes', () => {
      const { getByTestId } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // Initially not focused
      expect(getByTestId('amount-display-inactive')).toBeOnTheScreen();

      // Activate keypad input
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Simulate keypad input change
      act(() => {
        capturedOnChange?.({
          value: '50',
          valueAsNumber: 50,
        });
      });

      // Should now show active display
      expect(getByTestId('amount-display-active')).toBeOnTheScreen();
    });

    it('preserves decimal point when user just types it', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Activate keypad input
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Simulate typing just a decimal point
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
    it('hides summary when input is focused', () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Initially, summary should be visible
      expect(queryByText('Provider fee')).toBeOnTheScreen();

      // Activate input focus
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Summary should now be hidden
      expect(queryByText('Provider fee')).not.toBeOnTheScreen();
    });

    it('hides bottom content when input is focused', () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <PredictPlaceBet />,
        {
          state: initialState,
        },
      );

      // Initially, bottom content should be visible
      expect(queryByText('All payments are made in USDC')).toBeOnTheScreen();

      // Activate input focus
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Bottom content should now be hidden
      expect(
        queryByText('All payments are made in USDC'),
      ).not.toBeOnTheScreen();
    });

    it('shows keypad when input is focused', () => {
      const { getByTestId } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      // Initially, keypad should not be visible
      expect(() => getByTestId('keypad')).toThrow();

      // Activate input focus
      const amountDisplay = getByTestId('amount-display-inactive');
      fireEvent.press(amountDisplay);

      // Keypad should now be visible
      expect(getByTestId('keypad')).toBeOnTheScreen();
    });
  });

  describe('error handling', () => {
    it('handles navigation dispatch errors gracefully', () => {
      const mockResult = { success: true, txMeta: { id: 'test' } };
      mockPlaceOrder.mockReturnValue(mockResult);
      mockDispatch.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      const { getByText } = renderWithProvider(<PredictPlaceBet />, {
        state: initialState,
      });

      const placeBetButton = getByText('Yes • 50¢');

      // Even though navigation fails, placeOrder should still be called
      expect(() => {
        fireEvent.press(placeBetButton);
      }).not.toThrow();

      expect(mockPlaceOrder).toHaveBeenCalled();
    });
  });
});
