import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictBuyWithAnyToken from './PredictBuyWithAnyToken';
import type { PredictBuyPreviewProps } from '../../types/navigation';

const mockHandleConfirm = jest.fn();
const mockPlaceOrder = jest.fn();
const mockShowOrderPlacedToast = jest.fn();
const mockInvalidateOrderQueries = jest.fn();
const mockResetOrderNotFilled = jest.fn();
const mockClearBuyErrorBanner = jest.fn();
const mockSetCurrentValue = jest.fn();
const mockSetCurrentValueUSDString = jest.fn();
const mockSetIsInputFocused = jest.fn();
const mockSetIsUserInputChange = jest.fn();
const mockSetIsConfirming = jest.fn();
const mockHandleRetryWithBestPrice = jest.fn();

let mockPayWithAnyTokenEnabled = true;
let mockFakOrdersEnabled = false;
let mockIsPreviewCalculating = false;
let mockIsPlacingOrder = false;
let mockErrorMessage: string | undefined;
let mockBuyErrorBanner: {
  variant: 'price_changed' | 'order_failed';
  title: string;
  description: string;
} | null = null;

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: {
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1', title: 'Yes', price: 0.62 },
      entryPoint: 'market_details',
    },
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPredictWithAnyTokenEnabledFlag: jest.fn(
    () => mockPayWithAnyTokenEnabled,
  ),
  selectPredictFakOrdersEnabledFlag: jest.fn(() => mockFakOrdersEnabled),
}));

jest.mock('../../utils/analytics', () => ({
  parseAnalyticsProperties: jest.fn(() => ({
    marketId: 'market-1',
    sharePrice: 0.62,
  })),
}));

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

jest.mock('../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    isPlacingOrder: mockIsPlacingOrder,
  }),
}));

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: () => ({
    preview: {
      sharePrice: 0.62,
      minAmountReceived: 24,
    },
    error: null,
    isCalculating: mockIsPreviewCalculating,
  }),
}));

jest.mock('../../hooks/usePredictOrderRetry', () => ({
  usePredictOrderRetry: () => ({
    retrySheetRef: { current: null },
    retrySheetVariant: 'busy',
    isRetrying: false,
    handleRetryWithBestPrice: mockHandleRetryWithBestPrice,
  }),
}));

jest.mock('../../hooks/usePredictPlaceOrder', () => ({
  usePredictPlaceOrder: () => ({
    showOrderPlacedToast: mockShowOrderPlacedToast,
    invalidateOrderQueries: mockInvalidateOrderQueries,
  }),
}));

jest.mock('./hooks/usePredictBuyAvailableBalance', () => ({
  usePredictBuyAvailableBalance: () => ({
    availableBalance: 10,
    isBalanceLoading: false,
  }),
}));

jest.mock('./hooks/usePredictBuyInputState', () => ({
  usePredictBuyInputState: () => ({
    currentValue: 20,
    setCurrentValue: mockSetCurrentValue,
    currentValueUSDString: '$20.00',
    setCurrentValueUSDString: mockSetCurrentValueUSDString,
    isInputFocused: false,
    setIsInputFocused: mockSetIsInputFocused,
    isUserInputChange: true,
    setIsUserInputChange: mockSetIsUserInputChange,
    isConfirming: false,
    setIsConfirming: mockSetIsConfirming,
  }),
}));

jest.mock('./hooks/usePredictBuyInfo', () => ({
  usePredictBuyInfo: () => ({
    toWin: 24,
    metamaskFee: 1,
    providerFee: 2,
    total: 23,
    depositFee: 3,
    rewardsFeeAmount: 5,
    totalPayForPredictBalance: 20,
  }),
}));

jest.mock('./hooks/usePredictBuyConditions', () => ({
  usePredictBuyConditions: () => ({
    canPlaceBet: true,
    isUserChangeTriggeringCalculation: false,
    isPayFeesLoading: false,
    isBalancePulsing: false,
    isBelowMinimum: false,
    isInsufficientBalance: false,
    maxBetAmount: 50,
  }),
}));

jest.mock('./hooks/usePredictBuyError', () => ({
  usePredictBuyError: () => ({
    errorMessage: mockErrorMessage,
    buyErrorBanner: mockBuyErrorBanner,
    isOrderNotFilled: false,
    resetOrderNotFilled: mockResetOrderNotFilled,
    clearBuyErrorBanner: mockClearBuyErrorBanner,
  }),
}));

jest.mock('./hooks/usePredictBuyActions', () => ({
  usePredictBuyActions: () => ({
    handleConfirm: mockHandleConfirm,
    placeOrder: mockPlaceOrder,
  }),
}));

jest.mock(
  './components/PredictBuyPreviewHeader/PredictBuyPreviewHeader',
  () => {
    const { Text } = jest.requireActual('react-native');
    return function MockPredictBuyPreviewHeader() {
      return <Text testID="predict-buy-preview-header">Header</Text>;
    };
  },
);

jest.mock('./components/PredictBuyAmountSection', () => {
  const { Text } = jest.requireActual('react-native');
  return function MockPredictBuyAmountSection({
    availableBalanceDisplay,
    isPlacingOrder,
  }: {
    availableBalanceDisplay: string;
    isPlacingOrder: boolean;
  }) {
    return (
      <Text testID="predict-buy-amount-section">
        {`Amount Section ${availableBalanceDisplay} placing-${String(
          isPlacingOrder,
        )}`}
      </Text>
    );
  };
});

jest.mock('./components/PredictBuyBottomContent', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictBuyBottomContent({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="predict-buy-bottom-content">{children}</View>;
  };
});

jest.mock('./components/PredictBuyError', () => {
  const { Text } = jest.requireActual('react-native');
  return function MockPredictBuyError({
    errorMessage,
  }: {
    errorMessage?: string;
  }) {
    return <Text testID="predict-buy-error">{errorMessage ?? 'no-error'}</Text>;
  };
});

jest.mock('./components/PredictBuyErrorBanner', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictBuyErrorBanner({
    variant,
    title,
    description,
    testID,
  }: {
    variant: string;
    title: string;
    description: string;
    testID?: string;
  }) {
    return (
      <View testID={testID ?? 'predict-buy-error-banner'}>
        <Text testID={`${testID ?? 'banner'}-variant`}>{variant}</Text>
        <Text testID={`${testID ?? 'banner'}-title`}>{title}</Text>
        <Text testID={`${testID ?? 'banner'}-description`}>{description}</Text>
      </View>
    );
  };
});

jest.mock('../../components/PredictFeeBreakdownSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (
      {
        onClose,
        fakOrdersEnabled,
      }: {
        onClose: () => void;
        fakOrdersEnabled: boolean;
      },
      _ref: unknown,
    ) => (
      <View testID="predict-fee-breakdown-sheet">
        <Text>{`fak-orders-${String(fakOrdersEnabled)}`}</Text>
        <Pressable testID="close-fee-breakdown" onPress={onClose}>
          <Text>Close Fee Breakdown</Text>
        </Pressable>
      </View>
    ),
  );
});

jest.mock('../../components/PredictKeypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef((_props: unknown, _ref: unknown) => (
    <View testID="predict-keypad" />
  ));
});

jest.mock('../../components/PredictOrderRetrySheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef((_props: unknown, _ref: unknown) => (
    <View testID="predict-order-retry-sheet" />
  ));
});

jest.mock('./components/PredictPayWithAnyTokenInfo', () => {
  const { Text } = jest.requireActual('react-native');
  return function MockPredictPayWithAnyTokenInfo({
    currentValue,
  }: {
    currentValue: number;
    isInputFocused: boolean;
  }) {
    return <Text testID="predict-pay-with-any-token-info">{currentValue}</Text>;
  };
});

jest.mock('./components/PredictPayWithRow', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PredictPayWithRow: ({
      disabled,
      variant,
    }: {
      disabled?: boolean;
      variant?: string;
    }) => (
      <Text testID="predict-pay-with-row">{`disabled-${String(disabled)} variant-${variant ?? 'default'}`}</Text>
    ),
  };
});

jest.mock('./components/PredictQuickAmounts', () => {
  const { View, Pressable, Text } = jest.requireActual('react-native');
  return function MockPredictQuickAmounts({
    onSelectAmount,
    disabled,
  }: {
    onSelectAmount: (amount: number) => void;
    disabled: boolean;
  }) {
    return (
      <View testID="predict-quick-amounts">
        <Pressable
          testID="quick-amount-20"
          onPress={() => onSelectAmount(20)}
          disabled={disabled}
        >
          <Text>$20</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock('./components/PredictFeeSummary/PredictFeeSummary', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return function MockPredictFeeSummary({
    handleFeesInfoPress,
  }: {
    handleFeesInfoPress: () => void;
  }) {
    return (
      <Pressable testID="predict-fee-summary" onPress={handleFeesInfoPress}>
        <Text>Fee Summary</Text>
      </Pressable>
    );
  };
});

jest.mock('./components/PredictBuyActionButton', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return function MockPredictBuyActionButton({
    onPress,
    disabled,
    isRetry,
  }: {
    onPress: () => void;
    disabled: boolean;
    isRetry?: boolean;
  }) {
    return (
      <Pressable testID="predict-buy-action-button" onPress={onPress}>
        <Text>{`button-disabled-${String(disabled)} retry-${String(
          isRetry ?? false,
        )}`}</Text>
      </Pressable>
    );
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('PredictBuyWithAnyToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayWithAnyTokenEnabled = true;
    mockFakOrdersEnabled = false;
    mockIsPreviewCalculating = false;
    mockIsPlacingOrder = false;
    mockErrorMessage = undefined;
    mockBuyErrorBanner = null;
    mockUseSelector.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {},
            },
          },
        });
      }

      return undefined;
    });
  });

  it('renders the screen, resets user input change after preview calculation, and opens the fee breakdown sheet', () => {
    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(screen.getByTestId('predict-buy-preview-header')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-buy-amount-section')).toHaveTextContent(
      'Amount Section $10.00 placing-false',
    );
    expect(screen.getByTestId('predict-pay-with-row')).toHaveTextContent(
      /disabled-false/,
    );
    expect(mockSetIsUserInputChange).toHaveBeenCalledWith(false);

    fireEvent.press(screen.getByTestId('predict-fee-summary'));

    expect(screen.getByTestId('predict-fee-breakdown-sheet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('close-fee-breakdown'));

    expect(
      screen.queryByTestId('predict-fee-breakdown-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('hides the pay with row when the feature flag is disabled', () => {
    mockPayWithAnyTokenEnabled = false;

    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(screen.queryByTestId('predict-pay-with-row')).not.toBeOnTheScreen();
  });

  it('does not reset user input change while preview calculation is still running', () => {
    mockIsPreviewCalculating = true;

    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(mockSetIsUserInputChange).not.toHaveBeenCalled();
  });

  it('disables token selection while an order is being placed', () => {
    mockIsPlacingOrder = true;

    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(screen.getByTestId('predict-buy-amount-section')).toHaveTextContent(
      'Amount Section $10.00 placing-true',
    );
    expect(screen.getByTestId('predict-pay-with-row')).toHaveTextContent(
      /disabled-true/,
    );
  });

  describe('sheet mode', () => {
    const sheetProps = {
      mode: 'sheet' as const,
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1', title: 'Yes', price: 0.62 },
      entryPoint: 'market_details',
      onClose: jest.fn(),
    } as unknown as PredictBuyPreviewProps;

    it('hides PredictBuyPreviewHeader in sheet mode', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      expect(
        screen.queryByTestId('predict-buy-preview-header'),
      ).not.toBeOnTheScreen();
    });

    it('renders PredictQuickAmounts inside bottom content', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      expect(screen.getByTestId('predict-quick-amounts')).toBeOnTheScreen();
    });

    it('renders PredictPayWithRow with variant="row" in sheet mode', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      expect(screen.getByTestId('predict-pay-with-row')).toHaveTextContent(
        /variant-row/,
      );
    });

    it('renders keypad below bottom content in sheet mode', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      expect(screen.getByTestId('predict-keypad')).toBeOnTheScreen();
    });

    it('sets isInputFocused to false when quick amount is tapped', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      fireEvent.press(screen.getByTestId('quick-amount-20'));

      expect(mockSetIsInputFocused).toHaveBeenCalledWith(false);
      expect(mockSetCurrentValue).toHaveBeenCalledWith(20);
      expect(mockSetCurrentValueUSDString).toHaveBeenCalledWith('20');
    });

    it('hides upper PredictPayWithRow outside ScrollView in sheet mode', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      const payWithRows = screen.getAllByTestId('predict-pay-with-row');
      expect(payWithRows.length).toBe(1);
      expect(payWithRows[0]).toHaveTextContent(/variant-row/);
    });

    it('renders the price_changed banner with retry CTA when buyErrorBanner is set in sheet mode', () => {
      mockBuyErrorBanner = {
        variant: 'price_changed',
        title: 'Price changed',
        description: "Couldn't buy at $0.62. Try at market price?",
      };

      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      expect(
        screen.getByTestId('predict-buy-preview-price-changed-banner'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('predict-buy-error')).not.toBeOnTheScreen();
      expect(screen.getByTestId('predict-buy-action-button')).toHaveTextContent(
        /retry-true/,
      );
    });

    it('renders the order_failed banner when activeOrder error is generic', () => {
      mockBuyErrorBanner = {
        variant: 'order_failed',
        title: 'Order failed',
        description: 'There was a problem',
      };

      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      expect(
        screen.getByTestId('predict-buy-preview-order-failed-banner'),
      ).toBeOnTheScreen();
    });

    it('routes the action button to handleRetryWithBestPrice when banner is active', () => {
      mockBuyErrorBanner = {
        variant: 'order_failed',
        title: 'Order failed',
        description: 'oops',
      };

      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      fireEvent.press(screen.getByTestId('predict-buy-action-button'));

      expect(mockHandleRetryWithBestPrice).toHaveBeenCalledTimes(1);
      expect(mockHandleConfirm).not.toHaveBeenCalled();
    });

    it('routes the action button to handleConfirm when no banner is active', () => {
      renderWithProvider(<PredictBuyWithAnyToken {...sheetProps} />);

      fireEvent.press(screen.getByTestId('predict-buy-action-button'));

      expect(mockHandleConfirm).toHaveBeenCalledTimes(1);
      expect(mockHandleRetryWithBestPrice).not.toHaveBeenCalled();
    });
  });

  describe('non-sheet mode', () => {
    it('does NOT render the banner even if buyErrorBanner is set', () => {
      mockBuyErrorBanner = {
        variant: 'order_failed',
        title: 'Order failed',
        description: 'oops',
      };

      renderWithProvider(<PredictBuyWithAnyToken />);

      expect(
        screen.queryByTestId('predict-buy-preview-order-failed-banner'),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId('predict-buy-error')).toBeOnTheScreen();
    });

    it('keeps the action button as confirm (not retry) outside sheet mode', () => {
      mockBuyErrorBanner = {
        variant: 'order_failed',
        title: 'Order failed',
        description: 'oops',
      };

      renderWithProvider(<PredictBuyWithAnyToken />);

      expect(screen.getByTestId('predict-buy-action-button')).toHaveTextContent(
        /retry-false/,
      );
    });
  });
});
